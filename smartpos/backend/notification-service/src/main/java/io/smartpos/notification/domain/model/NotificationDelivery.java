package io.smartpos.notification.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable record of a single send attempt. Status moves PENDING → SENT/FAILED.
 * Failed deliveries with attempts &lt; max are picked up by the retry scheduler.
 */
@Entity
@Table(name = "notification_deliveries")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class NotificationDelivery {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false)
    private Channel channel;

    @Column(name = "template_code")
    private String templateCode;

    @Column(name = "recipient", nullable = false)
    private String recipient;

    @Column(name = "subject")
    private String subject;

    @Column(name = "rendered_body", nullable = false)
    private String renderedBody;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PENDING;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "related_aggregate")
    private String relatedAggregate;

    @Column(name = "related_aggregate_id")
    private UUID relatedAggregateId;

    /**
     * Caller-supplied context (sale id, customer name, totals, etc).
     * Persisted as JSONB; see Hibernate docs for the JsonBinaryType wiring.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_meta", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> payloadMeta = new HashMap<>();

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
