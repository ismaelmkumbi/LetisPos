package io.smartpos.notification.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.notification.api.dto.DeliveryDto;
import io.smartpos.notification.api.dto.MultiSendRequest;
import io.smartpos.notification.api.dto.SendRequest;
import io.smartpos.notification.application.channel.ChannelDispatcher;
import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.DeliveryStatus;
import io.smartpos.notification.domain.model.NotificationDelivery;
import io.smartpos.notification.domain.model.NotificationTemplate;
import io.smartpos.notification.domain.repository.NotificationDeliveryRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

/**
 * Orchestrates a notification:
 *   1. Resolve template (or use inline body)
 *   2. Render placeholders
 *   3. Persist a PENDING delivery row (audit + retry)
 *   4. Dispatch via the channel transport
 *   5. Mark SENT or FAILED + schedule next retry
 *
 * The {@link #retryFailed} scheduler picks up FAILED rows whose next_retry_at has elapsed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final TemplateService templateService;
    private final TemplateRenderer renderer;
    private final NotificationDeliveryRepository deliveryRepo;
    private final List<ChannelDispatcher> dispatchers;

    @Value("${smartpos.notification.retry.max-attempts:3}")
    private int maxAttempts;

    @Value("${smartpos.notification.retry.backoff-seconds:60}")
    private int backoffSeconds;

    private final Map<Channel, ChannelDispatcher> byChannel = new EnumMap<>(Channel.class);

    @PostConstruct
    void wireDispatchers() {
        dispatchers.forEach(d -> byChannel.put(d.channel(), d));
        log.info("Notification dispatchers registered: {}", byChannel.keySet());
    }

    @Transactional(readOnly = true)
    public Page<DeliveryDto> search(Channel channel, DeliveryStatus status, String recipient, Pageable pageable) {
        return deliveryRepo.search(channel, status, recipient, TenantContext.get().orElse(null), pageable).map(DeliveryDto::from);
    }

    @Transactional(readOnly = true)
    public DeliveryDto get(UUID id) {
        NotificationDelivery d = deliveryRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Delivery not found"));
        UUID currentTenant = TenantContext.get().orElse(null);
        if (d.getTenantId() != null && !currentTenant.equals(d.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Delivery not found");
        }
        return DeliveryDto.from(d);
    }

    @Transactional
    public DeliveryDto send(SendRequest req) {
        // Resolve subject/body from template when caller didn't pass an inline body.
        String subject = req.subject();
        String body    = req.body();
        if (req.templateCode() != null && (body == null || body.isBlank())) {
            NotificationTemplate t = templateService.resolve(null, req.templateCode(), req.channel())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "No template for code=" + req.templateCode() + " channel=" + req.channel()));
            subject = subject != null ? subject : t.getSubject();
            body    = t.getBody();
        }
        if (body == null || body.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "templateCode or body is required");
        }

        Map<String, Object> data = req.data() == null ? Map.of() : req.data();
        String renderedSubject = renderer.render(subject, data);
        String renderedBody    = renderer.render(body, data);

        HashMap<String, Object> meta = new HashMap<>(data);
        if (req.attachmentBase64() != null && !req.attachmentBase64().isBlank()) {
            meta.put("_attachmentBase64", req.attachmentBase64());
            meta.put("_attachmentName", req.attachmentName() != null ? req.attachmentName() : "attachment.pdf");
        }

        NotificationDelivery delivery = deliveryRepo.save(NotificationDelivery.builder()
                .channel(req.channel())
                .templateCode(req.templateCode())
                .recipient(req.recipient())
                .subject(renderedSubject)
                .renderedBody(renderedBody)
                .status(DeliveryStatus.PENDING)
                .relatedAggregate(req.relatedAggregate())
                .relatedAggregateId(req.relatedAggregateId())
                .tenantId(TenantContext.require())
                .payloadMeta(meta)
                .build());

        dispatch(delivery);
        return DeliveryDto.from(delivery);
    }

    /**
     * Fire-and-forget multi-channel dispatch. Tries each channel independently;
     * a failure on one channel does not block the others.
     */
    @Transactional
    public List<DeliveryDto> sendMulti(MultiSendRequest req) {
        List<DeliveryDto> results = new ArrayList<>();
        for (SendRequest item : req.items()) {
            try {
                results.add(send(item));
            } catch (Exception e) {
                log.warn("Multi-send failed for channel={} recipient={}: {}",
                    item.channel(), item.recipient(), e.getMessage());
                // Synthesize a failed result so the caller sees per-channel status
                results.add(new DeliveryDto(null, item.channel(), item.templateCode(),
                    item.recipient(), item.subject(), DeliveryStatus.FAILED,
                    e.getMessage(), null, 0, item.relatedAggregate(),
                    item.relatedAggregateId(), null, null, null));
            }
        }
        return results;
    }

    /** Re-attempt a single delivery on demand (admin action from the deliveries view). */
    @Transactional
    public DeliveryDto retry(UUID id) {
        NotificationDelivery d = deliveryRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Delivery not found"));
        UUID currentTenant = TenantContext.require();
        if (d.getTenantId() != null && !currentTenant.equals(d.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Delivery not found");
        }
        if (d.getStatus() == DeliveryStatus.SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already sent");
        }
        dispatch(d);
        return DeliveryDto.from(d);
    }

    /** Background retry — runs every minute; processes a small batch each tick. */
    @Scheduled(fixedDelayString = "${smartpos.notification.retry.tick-ms:60000}")
    @Transactional
    public void retryFailed() {
        List<NotificationDelivery> due = deliveryRepo.findRetryable(
                Instant.now(), maxAttempts, PageRequest.of(0, 50));
        if (due.isEmpty()) return;
        log.debug("Retrying {} failed notifications", due.size());
        due.forEach(this::dispatch);
    }

    // ----------------------------------------------------------------
    // internals
    // ----------------------------------------------------------------

    private void dispatch(NotificationDelivery d) {
        ChannelDispatcher dispatcher = byChannel.get(d.getChannel());
        if (dispatcher == null) {
            markFailed(d, "No dispatcher registered for " + d.getChannel());
            return;
        }
        d.setAttempts(d.getAttempts() + 1);
        ChannelDispatcher.Result result;
        try {
            result = dispatcher.send(d);
        } catch (Exception e) {
            result = ChannelDispatcher.Result.fail(e.getMessage());
        }
        if (result.success()) {
            d.setStatus(DeliveryStatus.SENT);
            d.setSentAt(Instant.now());
            d.setProviderMessageId(result.providerMessageId());
            d.setErrorMessage(null);
            d.setNextRetryAt(null);
        } else {
            markFailed(d, result.errorMessage());
        }
        deliveryRepo.save(d);
    }

    private void markFailed(NotificationDelivery d, String error) {
        d.setStatus(DeliveryStatus.FAILED);
        d.setErrorMessage(error);
        if (d.getAttempts() < maxAttempts) {
            // Exponential-ish backoff: backoffSeconds * 2^(attempts-1)
            long secs = (long) backoffSeconds * (1L << Math.max(0, d.getAttempts() - 1));
            d.setNextRetryAt(Instant.now().plusSeconds(secs));
        } else {
            d.setNextRetryAt(null); // give up
        }
    }
}
