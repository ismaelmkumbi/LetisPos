package io.smartpos.auth.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.auth.api.dto.RegisterRequest;
import io.smartpos.auth.domain.model.BillingPlan;
import io.smartpos.auth.domain.model.OutboxEvent;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.repository.OutboxRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.feign.BillingClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterUserUseCase {

    private final UserRepository userRepository;
    private final OutboxRepository outboxRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final TenantService tenantService;
    private final BillingClient billingClient;
    private final SendVerificationUseCase sendVerificationUseCase;
    private final TransactionTemplate transactionTemplate;

    @Transactional
    public UUID register(RegisterRequest req) {
        // Validate channel
        String channelStr = req.channel() != null ? req.channel().toUpperCase() : "EMAIL";
        VerificationChannel channel;
        try {
            channel = VerificationChannel.valueOf(channelStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid channel. Must be EMAIL or PHONE.");
        }

        if (channel == VerificationChannel.EMAIL) {
            if (req.email() == null || req.email().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required for EMAIL channel.");
            }
            if (userRepository.existsByEmailIgnoreCase(req.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
            }
        } else {
            if (req.phoneNumber() == null || req.phoneNumber().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required for PHONE channel.");
            }
        }

        // Resolve tenant: explicit tenantId, auto-create from tenantName, or leave null
        UUID tenantId = req.tenantId();
        Tenant tenant = null;
        if (tenantId == null && req.tenantName() != null && !req.tenantName().isBlank()) {
            BillingPlan plan = req.billingPlan() != null && !req.billingPlan().isBlank()
                    ? BillingPlan.valueOf(req.billingPlan().toUpperCase())
                    : null;
            tenant = tenantService.create(req.tenantName(), req.tenantSlug(), plan);
            tenantId = tenant.getId();

            // Create subscription for the new tenant's billing plan
            // Run in a separate transaction so failure doesn't rollback registration
            createSubscriptionAsync(tenant);
        }

        // Enforce plan maxUsers limit
        if (tenantId != null) {
            if (tenant == null) {
                tenant = tenantService.getById(tenantId);
            }
            long currentCount = userRepository.countByTenantId(tenantId);
            if (currentCount >= tenant.getMaxUsers()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "User limit reached. Your plan allows " + tenant.getMaxUsers()
                        + " users. Upgrade to add more.");
            }
        }

        // Create user as PENDING
        User user = User.builder()
                .email(channel == VerificationChannel.EMAIL ? req.email().toLowerCase() : null)
                .phoneNumber(channel == VerificationChannel.PHONE ? req.phoneNumber() : null)
                .username(channel == VerificationChannel.EMAIL ? req.email().toLowerCase() : req.phoneNumber())
                .passwordHash(passwordEncoder.encode(req.password()))
                .status(UserStatus.PENDING)
                .tenantId(tenantId)
                .build();
        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Emit UserRegistered event via outbox so User Service can create a profile.
        publishUserRegistered(user, req);

        // Send verification — run in separate transaction to avoid poisoning registration
        sendVerificationAsync(user, channel);

        log.info("Registered user id={} channel={} tenantId={}", user.getId(), channel, tenantId);
        return user.getId();
    }

    /**
     * Creates the billing subscription in a separate transaction.
     * If billing service is down, the registration still succeeds.
     */
    private void createSubscriptionAsync(Tenant tenant) {
        transactionTemplate.executeWithoutResult(newStatus -> {
            try {
                Instant now = Instant.now();
                billingClient.createSubscription(Map.of(
                        "tenantId", tenant.getId().toString(),
                        "planCode", tenant.getBillingPlan().name().toLowerCase(),
                        "status", "TRIAL",
                        "billingCycle", "MONTHLY",
                        "currentPeriodStart", now.toString(),
                        "currentPeriodEnd", now.plusSeconds(30 * 86400).toString()
                ));
            } catch (Exception e) {
                log.warn("Failed to create subscription for tenant {}: {}", tenant.getId(), e.getMessage());
            }
        });
    }

    /**
     * Sends verification in a separate transaction.
     * If email/phone delivery fails, the registration still succeeds.
     */
    private void sendVerificationAsync(User user, VerificationChannel channel) {
        transactionTemplate.executeWithoutResult(newStatus -> {
            try {
                sendVerificationUseCase.send(user, channel);
            } catch (Exception e) {
                log.warn("Failed to send verification for user={}: {}", user.getId(), e.getMessage());
            }
        });
    }

    private void publishUserRegistered(User user, RegisterRequest req) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "userId",    user.getId(),
                    "email",     user.getEmail(),
                    "username",  user.getUsername() == null ? "" : user.getUsername(),
                    "firstName", req.firstName() == null ? "" : req.firstName(),
                    "lastName",  req.lastName() == null ? "" : req.lastName(),
                    "tenantId",  user.getTenantId() == null ? "" : user.getTenantId().toString()
            ));
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateType("User")
                    .aggregateId(user.getId())
                    .eventType("UserRegistered")
                    .payload(payload)
                    .build();
            outboxRepository.save(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize UserRegistered event", e);
        }
    }
}
