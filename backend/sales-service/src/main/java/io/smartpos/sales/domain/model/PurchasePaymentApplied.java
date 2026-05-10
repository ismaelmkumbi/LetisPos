package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Idempotency record proving a Payment Service payment has been applied to a
 * Purchase. This mirrors SalePaymentApplied so duplicate Feign/Kafka retries do
 * not inflate purchase paid totals.
 */
@Entity
@Table(name = "purchase_payments_applied")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PurchasePaymentApplied {

    public enum Source { FEIGN, KAFKA }

    @Id
    @Column(name = "payment_id", nullable = false, updatable = false)
    private UUID paymentId;

    @Column(name = "purchase_id", nullable = false)
    private UUID purchaseId;

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
