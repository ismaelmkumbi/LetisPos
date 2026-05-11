package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Tracks inventory at the batch/lot level within a warehouse.
 *
 * Each batch is a discrete quantity of a product received together
 * (same manufacturing date, same expiry date). Stock is tracked
 * independently per batch, allowing FEFO/FIFO picking and expiry
 * management.
 */
@Entity
@Table(name = "product_batches")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProductBatch {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "warehouse_id", nullable = false)
    private UUID warehouseId;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "on_hand", nullable = false)
    @Builder.Default
    private BigDecimal onHand = BigDecimal.ZERO;

    @Column(name = "reserved", nullable = false)
    @Builder.Default
    private BigDecimal reserved = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    // ---- domain operations ----

    /** Available quantity = on_hand minus reserved. */
    public BigDecimal available() {
        return onHand.subtract(reserved);
    }
}
