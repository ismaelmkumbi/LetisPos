package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "stock_count_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StockCountLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "count_id", insertable = false, updatable = false)
    private UUID countId;

    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id")                   private UUID variantId;

    @Column(name = "system_qty",  nullable = false) private BigDecimal systemQty;
    @Column(name = "counted_qty", nullable = false) private BigDecimal countedQty;

    /** Auto-computed column (DB GENERATED ALWAYS AS). Read-only. */
    @Column(name = "difference", insertable = false, updatable = false)
    private BigDecimal difference;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }
}
