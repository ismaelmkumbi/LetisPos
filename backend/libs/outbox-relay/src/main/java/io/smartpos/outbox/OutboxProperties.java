package io.smartpos.outbox;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the outbox → Kafka relay.
 *
 * {@code topic-prefix} must be unique per service domain. Example:
 *   smartpos.outbox.topic-prefix: smartpos.sales
 * → event_type "SaleConfirmed" lands on topic "smartpos.sales.sale-confirmed.v1"
 */
@ConfigurationProperties(prefix = "smartpos.outbox")
public record OutboxProperties(
        Boolean enabled,
        String  topicPrefix,
        Integer batchSize,
        Long    pollMs,
        Integer sendTimeoutMs,
        String  tableName
) {
    public OutboxProperties {
        if (enabled       == null) enabled       = Boolean.TRUE;
        if (batchSize     == null) batchSize     = 100;
        if (pollMs        == null) pollMs        = 1_000L;
        if (sendTimeoutMs == null) sendTimeoutMs = 5_000;
        if (tableName     == null) tableName     = "outbox";
        // topicPrefix is required when enabled=true; validated at startup
    }
}
