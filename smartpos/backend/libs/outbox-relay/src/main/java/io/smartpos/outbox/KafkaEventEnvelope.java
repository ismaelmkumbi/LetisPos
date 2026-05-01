package io.smartpos.outbox;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

/**
 * The message format on Kafka. Consumers parse this first, then pull the
 * inner {@code payload} JsonNode for the event-specific fields.
 *
 * Wire format example (JSON):
 * {
 *   "eventId":       "9d36c2af-8c2e-4c33-8a24-…",
 *   "aggregateType": "Sale",
 *   "aggregateId":   "6a0a8b1b-…",
 *   "eventType":     "SaleConfirmed",
 *   "source":        "sales-service",
 *   "occurredAt":    "2026-04-24T12:34:56.789Z",
 *   "payload":       { "saleId": "…", "ref": "INV-2026-…", … }
 * }
 */
public record KafkaEventEnvelope(
        String    eventId,
        String    aggregateType,
        String    aggregateId,
        String    eventType,
        String    source,
        Instant   occurredAt,
        JsonNode  payload
) {}
