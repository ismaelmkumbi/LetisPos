package io.smartpos.report.infrastructure.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.report.application.FactProjectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Consumes PaymentReceived events and increments fact_payments_daily.
 * Idempotent via processed_events table.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventsConsumer {

    private final ObjectMapper           objectMapper;
    private final FactProjectionService  projections;

    @KafkaListener(topics = "smartpos.payment.payment-received.v1")
    public void onPaymentReceived(String body, Acknowledgment ack) {
        try {
            JsonNode envelope = objectMapper.readTree(body);
            UUID eventId = UUID.fromString(envelope.path("eventId").asText());

            if (!projections.markProcessed(eventId, "PaymentReceived", "Payment")) {
                ack.acknowledge();
                return;
            }

            JsonNode p = envelope.path("payload");
            LocalDate date   = LocalDate.parse(p.path("date").asText());
            UUID accountId   = UUID.fromString(p.path("accountId").asText());
            String method    = p.path("method").asText("CASH");
            UUID tenantId    = uuid(p, "tenantId");
            BigDecimal in    = bd(p, "amountIn");
            BigDecimal out   = bd(p, "amountOut");

            projections.applyPaymentReceived(date, accountId, method, tenantId, in, out);

            log.debug("Projected PaymentReceived {} → fact_payments_daily", eventId);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to project PaymentReceived: {}", e.getMessage(), e);
            // Re-throw so DefaultErrorHandler retries → DLT after MAX_RETRIES.
            throw new RuntimeException(e);
        }
    }

    private static UUID uuid(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) return null;
        String s = v.asText();
        return s == null || s.isBlank() ? null : UUID.fromString(s);
    }

    private static BigDecimal bd(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) return BigDecimal.ZERO;
        return new BigDecimal(v.asText("0"));
    }
}
