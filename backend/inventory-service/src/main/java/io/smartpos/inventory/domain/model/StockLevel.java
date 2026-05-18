package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/**
 * Per-(product, variant, warehouse) stock row.
 *
 * The single most contended row in the system. Writes use pessimistic locking
 * (SELECT ... FOR UPDATE) to serialise concurrent POS sales on the same SKU,
 * plus an optimistic {@code version} column as a second line of defence.
 */
@Entity
@Table(name = "stock_levels")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StockLevel {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id",   nullable = false) private UUID productId;
    @Column(name = "variant_id")                     private UUID variantId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;

    @Column(name = "on_hand", nullable = false)
    @Builder.Default
    private BigDecimal onHand = BigDecimal.ZERO;

    @Column(name = "reserved", nullable = false)
    @Builder.Default
    private BigDecimal reserved = BigDecimal.ZERO;

    @Column(name = "weighted_avg_cost", nullable = false)
    @Builder.Default
    private BigDecimal weightedAvgCost = BigDecimal.ZERO;

    @Column(name = "stock_alert_threshold", nullable = false)
    @Builder.Default
    private int stockAlertThreshold = 0;

    @Column(name = "tenant_id") private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    // ---- domain operations ----

    public BigDecimal available() {
        return onHand.subtract(reserved);
    }

    public void reserve(BigDecimal qty) {
        BigDecimal avail = available();
        if (qty.compareTo(avail) > 0) {
            throw new IllegalStateException(
                "Insufficient stock: requested=" + qty + " available=" + avail);
        }
        this.reserved = this.reserved.add(qty);
    }

    public void releaseReservation(BigDecimal qty) {
        this.reserved = this.reserved.subtract(qty).max(BigDecimal.ZERO);
    }

    /** Commit = deduct from both on_hand and reserved (i.e. the sale is final). */
    public void commitReserved(BigDecimal qty) {
        if (qty.compareTo(reserved) > 0) {
            throw new IllegalStateException(
                "Cannot commit more than reserved: reserved=" + reserved + " requested=" + qty);
        }
        this.reserved = this.reserved.subtract(qty);
        this.onHand   = this.onHand.subtract(qty);
    }

    /** Direct change to on_hand (adjustment, receive from purchase, transfer in/out). */
    public void applyDelta(BigDecimal delta) {
        BigDecimal next = onHand.add(delta);
        if (next.signum() < 0) {
            throw new IllegalStateException(
                "Adjustment would drive on_hand negative: on_hand=" + onHand + " delta=" + delta);
        }
        if (next.compareTo(reserved) < 0) {
            throw new IllegalStateException(
                "Adjustment would leave on_hand < reserved: on_hand=" + next + " reserved=" + reserved);
        }
        this.onHand = next;
    }

    /**
     * Recalculate weighted average cost BEFORE receiving new stock.
     * Call this BEFORE applyDelta so current onHand is pre-receipt.
     * newWAC = (onHand * currentWAC + receivedQty * receivedUnitCost) / (onHand + receivedQty)
     */
    public void recalculateWac(BigDecimal receivedQty, BigDecimal receivedUnitCost) {
        if (receivedQty.signum() <= 0) return;
        BigDecimal currentValue = this.onHand.multiply(this.weightedAvgCost);
        BigDecimal receivedValue = receivedQty.multiply(receivedUnitCost);
        BigDecimal totalQty = this.onHand.add(receivedQty);
        if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
            this.weightedAvgCost = currentValue.add(receivedValue)
                    .divide(totalQty, 4, RoundingMode.HALF_UP);
        }
    }
}
