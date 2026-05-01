package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One component line of a COMBO/bundle product.
 * `combo_product_id` is the parent (a Product whose type=COMBO),
 * `component_product_id` is the part being bundled.
 */
@Entity
@Table(name = "product_combo_items")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProductComboItem {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "combo_product_id", nullable = false)
    private UUID comboProductId;

    @Column(name = "component_product_id", nullable = false)
    private UUID componentProductId;

    @Column(name = "qty", nullable = false)
    @Builder.Default
    private BigDecimal qty = BigDecimal.ONE;

    /** Snapshot of component cost at time of bundling (optional). */
    @Column(name = "unit_cost")
    private BigDecimal unitCost;

    /** Snapshot of component price at time of bundling (optional). */
    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    /** Display order within the combo. */
    @Column(name = "position", nullable = false)
    @Builder.Default
    private int position = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
