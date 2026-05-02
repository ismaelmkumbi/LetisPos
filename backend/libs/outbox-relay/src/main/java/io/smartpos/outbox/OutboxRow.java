package io.smartpos.outbox;

import java.time.Instant;
import java.util.UUID;

/** Row fetched from the outbox table, before publishing. */
public record OutboxRow(
        UUID    id,
        String  aggregateType,
        UUID    aggregateId,
        String  eventType,
        String  payloadJson,
        Instant createdAt
) {}
