package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "adjustment_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AdjustmentLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "adjustment_id", insertable = false, updatable = false)
    private UUID adjustmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adjustment_id", nullable = false)
    private Adjustment adjustment;

    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id")                   private UUID variantId;

    /** Signed — positive = add, negative = remove. */
    @Column(name = "qty_delta", nullable = false)
    private BigDecimal qtyDelta;

    @Column(name = "unit_cost")
    private BigDecimal unitCost;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }
}
