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
 * Consumes SaleConfirmed events and increments fact_sales_daily.
 * Idempotent via processed_events table.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SalesEventsConsumer {

    private final ObjectMapper           objectMapper;
    private final FactProjectionService  projections;

    @KafkaListener(topics = "smartpos.sales.sale-confirmed.v1")
    public void onSaleConfirmed(String body, Acknowledgment ack) {
        try {
            JsonNode envelope = objectMapper.readTree(body);
            UUID eventId = UUID.fromString(envelope.path("eventId").asText());

            if (!projections.markProcessed(eventId, "SaleConfirmed", "Sale")) {
                ack.acknowledge();
                return;
            }

            JsonNode p = envelope.path("payload");
            LocalDate date = LocalDate.parse(p.path("date").asText());
            projections.applySaleConfirmed(
                    date,
                    uuid(p, "warehouseId"),
                    uuid(p, "userId"),
                    uuid(p, "customerId"),
                    uuid(p, "tenantId"),
                    bd(p, "grossTotal"),
                    bd(p, "taxTotal"),
                    bd(p, "discountTotal"),
                    bd(p, "netTotal")
            );

            // Per-line product cube projection (Phase 6c)
            JsonNode lines = p.path("lines");
            if (lines.isArray()) {
                for (JsonNode line : lines) {
                    projections.applySaleLine(
                            date,
                            uuid(line, "productId"),
                            uuid(p, "warehouseId"),
                            uuid(p, "tenantId"),
                            bd(line, "qty"),
                            bd(line, "gross"),
                            bd(line, "tax"),
                            bd(line, "net")
                    );
                }
            }

            log.debug("Projected SaleConfirmed {} → fact_sales_daily", eventId);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to project SaleConfirmed: {}", e.getMessage(), e);
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
