package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Suspended sale (cart hold) so a POS cart can be resumed
 * later — even from a different terminal.
 */
@Entity
@Table(name = "suspended_sales")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SuspendedSale {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false)
    private String ref;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "terminal_id")
    private UUID terminalId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "warehouse_id")
    private UUID warehouseId;

    @Column(name = "lines", columnDefinition = "jsonb")
    private String lines;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType;

    @Column(name = "discount_value")
    private BigDecimal discountValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method")
    private TaxMethod taxMethod;

    @Column(name = "notes")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SuspendedSaleStatus status = SuspendedSaleStatus.OPEN;

    @Column(name = "grand_total")
    private BigDecimal grandTotal;

    @Column(name = "total_items")
    private Integer totalItems;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (expiresAt == null) expiresAt = now.plus(java.time.Duration.ofDays(7));
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
}
