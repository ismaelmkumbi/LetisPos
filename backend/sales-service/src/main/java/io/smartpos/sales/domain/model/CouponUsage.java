package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Tracks each time a coupon is redeemed.
 */
@Entity
@Table(name = "coupon_usages")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CouponUsage {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "coupon_id", nullable = false)
    private UUID couponId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coupon_id", insertable = false, updatable = false)
    private Coupon coupon;

    @Column(name = "sale_id")
    private UUID saleId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "discount_applied", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountApplied;

    @Column(name = "used_at", nullable = false)
    private Instant usedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (usedAt == null) usedAt = Instant.now();
    }
}
