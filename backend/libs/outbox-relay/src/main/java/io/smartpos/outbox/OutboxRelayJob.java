package io.smartpos.outbox;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Scheduled;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Periodically drains the {@code outbox} table to Kafka.
 *
 * <p>Per-row publishing with synchronous ack: if Kafka rejects the send or
 * times out, the row stays unpublished and the next poll retries. This yields
 * <strong>at-least-once</strong> delivery (consumers must be idempotent).
 *
 * <p>Topic naming: {@code ${topic-prefix}.${event-type-kebab}.v1}
 * <br>Example: event_type "SaleConfirmed" → "smartpos.sales.sale-confirmed.v1"
 *
 * <p>Partition key = {@code aggregate_id} so events for the same aggregate
 * always land on the same partition (→ in-order consumption per aggregate).
 *
 * <p>Scheduling uses {@code @Scheduled(fixedDelayString)} so it's only
 * registered if {@code @EnableScheduling} is active in the application.
 */
@Slf4j
public class OutboxRelayJob {

    private static final String SELECT_SQL_TEMPLATE = """
        SELECT id, aggregate_type, aggregate_id, event_type, payload::text, created_at
          FROM %s
         WHERE published_at IS NULL
         ORDER BY created_at
         LIMIT ?
        """;

    private static final String MARK_PUBLISHED_TEMPLATE =
            "UPDATE %s SET published_at = now() WHERE id = ?";

    private final JdbcTemplate                jdbc;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper                objectMapper;
    private final OutboxProperties            props;
    private final String                      serviceName;
    private final String                      selectSql;
    private final String                      markPublishedSql;

    public OutboxRelayJob(JdbcTemplate jdbc,
                          KafkaTemplate<String, String> kafka,
                          ObjectMapper objectMapper,
                          OutboxProperties props,
                          String serviceName) {
        if (props.topicPrefix() == null || props.topicPrefix().isBlank()) {
            throw new IllegalStateException(
                "smartpos.outbox.topic-prefix must be set (e.g. 'smartpos.sales')");
        }
        this.jdbc          = jdbc;
        this.kafka         = kafka;
        this.objectMapper  = objectMapper;
        this.props         = props;
        this.serviceName   = serviceName;
        this.selectSql     = String.format(SELECT_SQL_TEMPLATE, safeTable(props.tableName()));
        this.markPublishedSql = String.format(MARK_PUBLISHED_TEMPLATE, safeTable(props.tableName()));
    }

    @Scheduled(fixedDelayString = "${smartpos.outbox.poll-ms:1000}")
    public void poll() {
        List<OutboxRow> rows;
        try {
            rows = jdbc.query(selectSql, ROW_MAPPER, props.batchSize());
        } catch (DataAccessException e) {
            log.warn("Outbox select failed: {}", e.getMessage());
            return;
        }
        if (rows.isEmpty()) return;
        log.debug("Outbox relay draining {} row(s)", rows.size());

        int published = 0, failed = 0;
        for (OutboxRow row : rows) {
            try {
                publishOne(row);
                jdbc.update(markPublishedSql, row.id());
                published++;
            } catch (Exception e) {
                failed++;
                log.error("Failed to relay outbox row id={} event={}: {}",
                        row.id(), row.eventType(), e.getMessage());
            }
        }
        if (published > 0 || failed > 0) {
            log.info("Outbox relay batch: published={} failed={}", published, failed);
        }
    }

    private void publishOne(OutboxRow row) throws Exception {
        String topic = buildTopic(row);
        String key   = row.aggregateId().toString();

        JsonNode payload = row.payloadJson() == null
                ? objectMapper.nullNode()
                : objectMapper.readTree(row.payloadJson());

        KafkaEventEnvelope envelope = new KafkaEventEnvelope(
                row.id().toString(),
                row.aggregateType(),
                row.aggregateId().toString(),
                row.eventType(),
                serviceName,
                row.createdAt(),
                payload
        );
        String body = objectMapper.writeValueAsString(envelope);

        SendResult<String, String> result = kafka.send(topic, key, body)
                .get(props.sendTimeoutMs(), TimeUnit.MILLISECONDS);
        log.debug("Relayed event {} to {}/{}@{}", row.eventType(),
                result.getRecordMetadata().topic(),
                result.getRecordMetadata().partition(),
                result.getRecordMetadata().offset());
    }

    String buildTopic(OutboxRow row) {
        return props.topicPrefix() + "." + camelToKebab(row.eventType()) + ".v1";
    }

    static String camelToKebab(String s) {
        if (s == null || s.isEmpty()) return s;
        StringBuilder out = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0) out.append('-');
                out.append(Character.toLowerCase(c));
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    /** Prevents SQL injection via table name (we format-substitute, not bind). */
    private static String safeTable(String table) {
        if (!table.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Unsafe outbox table name: " + table);
        }
        return table;
    }

    private static final RowMapper<OutboxRow> ROW_MAPPER = (rs, i) -> new OutboxRow(
            rs.getObject("id", UUID.class),
            rs.getString("aggregate_type"),
            rs.getObject("aggregate_id", UUID.class),
            rs.getString("event_type"),
            rs.getString(5),                // payload::text aliased positionally
            toInstant(rs.getTimestamp("created_at"))
    );

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
