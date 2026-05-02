package io.smartpos.payment.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.payment.api.dto.PaymentDto;
import io.smartpos.payment.api.dto.StripeDto;
import io.smartpos.payment.domain.model.PaymentMethod;
import io.smartpos.payment.domain.model.ReferenceType;
import io.smartpos.payment.domain.model.StripeWebhookEvent;
import io.smartpos.payment.domain.repository.StripeWebhookEventRepository;
import io.smartpos.payment.infrastructure.stripe.StripeProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Stripe integration.
 *
 * For dev / no-keys mode ({@code smartpos.payment.stripe.enabled=false}) the
 * service returns a mock PaymentIntent and the webhook handler accepts any
 * payload. To use real Stripe:
 *   1. set {@code smartpos.payment.stripe.enabled=true}
 *   2. provide {@code smartpos.payment.stripe.secret-key}
 *   3. provide {@code smartpos.payment.stripe.webhook-secret} and verify the
 *      signature in {@link #processWebhook(String, String)} (TODO marker).
 *   4. swap {@link #createPaymentIntent} for the real Stripe Java SDK call.
 *
 * Keeping the Stripe SDK out of the compile classpath for v1 avoids forcing
 * developers to set up API keys just to build the service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StripeService {

    private final StripeProperties props;
    private final StripeWebhookEventRepository webhookRepo;
    private final PaymentService paymentService;
    private final ObjectMapper mapper;

    public StripeDto.IntentResponse createPaymentIntent(StripeDto.IntentRequest req) {
        if (!props.enabled()) {
            // Dev / unconfigured mode — return a mock clientSecret that the
            // frontend treats as opaque. Real PaymentIntent creation is a
            // one-liner against the Stripe SDK; wire it in when you have keys.
            String mockId = "pi_mock_" + randomToken(16);
            log.info("[STRIPE-MOCK] Created mock PaymentIntent id={} amount={} currency={}",
                    mockId, req.amount(), req.currency());
            return new StripeDto.IntentResponse(mockId + "_secret_" + randomToken(8),
                    mockId, "requires_payment_method");
        }
        // Real mode — TODO: com.stripe.Stripe.apiKey = props.secretKey();
        //                  PaymentIntent.create(PaymentIntentCreateParams...)
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                "Real Stripe integration not wired — add com.stripe:stripe-java and implement");
    }

    /**
     * Processes a webhook body. Signature verification is deliberately separate
     * so it can be stubbed in dev.
     *
     * Known events we act on:
     *   payment_intent.succeeded → record Payment for the linked saleId
     *   payment_intent.payment_failed / canceled → log only
     */
    @Transactional
    public void processWebhook(String body, String signatureHeader) {
        try {
            // TODO: when keys are configured, call Webhook.constructEvent(body, sigHeader, webhookSecret)
            //       to verify HMAC. For now, accept everything.
            JsonNode json = mapper.readTree(body);
            String stripeEventId = text(json, "id");
            String type          = text(json, "type");
            if (stripeEventId == null || type == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Malformed Stripe webhook");
            }

            if (webhookRepo.findByStripeEventId(stripeEventId).isPresent()) {
                log.info("[STRIPE] Duplicate webhook {} — already processed", stripeEventId);
                return;                  // idempotent
            }

            StripeWebhookEvent event = webhookRepo.save(StripeWebhookEvent.builder()
                    .stripeEventId(stripeEventId)
                    .type(type)
                    .payload(body)
                    .build());

            if ("payment_intent.succeeded".equals(type)) {
                // Expected metadata:
                //   metadata.saleId
                //   metadata.accountId
                //   amount_received (Stripe minor units → divide 100)
                JsonNode object = json.path("data").path("object");
                JsonNode meta = object.path("metadata");
                UUID saleId    = uuid(meta.path("saleId"));
                UUID accountId = uuid(meta.path("accountId"));
                String currency = object.path("currency").asText("usd").toUpperCase();
                long minor = object.path("amount_received").asLong(0);
                BigDecimal amount = BigDecimal.valueOf(minor).movePointLeft(2);
                String intentId = object.path("id").asText();

                if (saleId != null && accountId != null && amount.signum() > 0) {
                    paymentService.record(new PaymentDto.CreateRequest(
                            null,                      // today's date
                            ReferenceType.SALE,
                            saleId,
                            accountId,
                            amount,
                            currency,
                            PaymentMethod.STRIPE,
                            intentId,
                            "Stripe webhook " + stripeEventId
                    ), null);
                } else {
                    log.warn("[STRIPE] payment_intent.succeeded missing metadata — skipping record. event={}", stripeEventId);
                }
            }

            event.setProcessedAt(Instant.now());
            webhookRepo.save(event);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("[STRIPE] webhook processing failed", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Webhook processing failed: " + e.getMessage());
        }
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }
    private static UUID uuid(JsonNode v) {
        try { return v.isMissingNode() || v.isNull() ? null : UUID.fromString(v.asText()); }
        catch (Exception e) { return null; }
    }
    private static String randomToken(int bytes) {
        byte[] b = new byte[bytes];
        new SecureRandom().nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }
}
