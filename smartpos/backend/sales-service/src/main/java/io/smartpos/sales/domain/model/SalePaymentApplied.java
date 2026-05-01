package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Idempotency record proving a given Payment Service payment has been applied
 * to a Sale. PK is the payment_id, so a duplicate insert from either the Feign
 * callback or the Kafka consumer fails fast with a constraint violation —
 * letting the caller skip the bump.
 */
@Entity
@Table(name = "sale_payments_applied")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SalePaymentApplied {

    public enum Source { FEIGN, KAFKA }

    @Id
    @Column(name = "payment_id", nullable = false, updatable = false)
    private UUID paymentId;

    @Column(name = "sale_id", nullable = false)
    private UUID saleId;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private Source source;

    @Column(name = "applied_at", nullable = false, updatable = false)
    private Instant appliedAt;

    @PrePersist
    void onCreate() {
        if (appliedAt == null) appliedAt = Instant.now();
    }
}
