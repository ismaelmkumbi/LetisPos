package io.smartpos.user.infrastructure.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.user.application.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Consumes {@code UserRegistered} events from Auth Service and creates the
 * matching profile row in user_db.
 *
 * Replaces the old {@code AdminProfileBootstrap} workaround — the bootstrap
 * still exists as a fallback for environments without Kafka (disable with
 * {@code SMARTPOS_USER_BOOTSTRAP_ADMIN_USER_ID=""}).
 *
 * Idempotency: {@link UserProfileService#createOrUpdateFromAuth} is a
 * save-or-update, so redelivery of the same event is safe.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserRegisteredConsumer {

    private final UserProfileService userProfileService;
    private final ObjectMapper       objectMapper;

    @KafkaListener(topics = "smartpos.auth.user-registered.v1")
    public void onUserRegistered(String messageBody, Acknowledgment ack) {
        try {
            JsonNode envelope = objectMapper.readTree(messageBody);
            JsonNode payload  = envelope.path("payload");

            UUID   userId    = UUID.fromString(payload.path("userId").asText());
            String email     = payload.path("email").asText();
            String firstName = text(payload, "firstName");
            String lastName  = text(payload, "lastName");
            UUID   tenantId  = uuid(payload, "tenantId");

            log.info("UserRegistered received: id={} email={}", userId, email);
            userProfileService.createOrUpdateFromAuth(userId, email, firstName, lastName, tenantId);

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process UserRegistered: {}", e.getMessage(), e);
            // Re-throw so DefaultErrorHandler (KafkaErrorConfig, Phase 6c)
            // retries 3× then routes to smartpos.auth.user-registered.v1.dlt.
            throw new RuntimeException(e);
        }
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v == null || v.isNull() ? "" : v.asText();
    }
    private static UUID uuid(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) return null;
        String s = v.asText();
        return s == null || s.isBlank() ? null : UUID.fromString(s);
    }
}
