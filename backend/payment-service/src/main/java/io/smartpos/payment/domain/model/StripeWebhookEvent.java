package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Idempotency log for Stripe webhooks — any repeat delivery of the same
 * {@code stripe_event_id} is a no-op because this row already exists.
 */
@Entity
@Table(name = "stripe_events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StripeWebhookEvent {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "stripe_event_id", nullable = false, unique = true)
    private String stripeEventId;

    @Column(name = "type", nullable = false)
    private String type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "processed_at")      private Instant processedAt;
    @Column(name = "processing_error")  private String processingError;
    @Column(name = "received_at", nullable = false, updatable = false) private Instant receivedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (receivedAt == null) receivedAt = Instant.now();
    }
}
