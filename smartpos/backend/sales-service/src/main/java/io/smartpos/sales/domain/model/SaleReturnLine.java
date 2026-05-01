package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "sale_return_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SaleReturnLine {

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "return_id", insertable = false, updatable = false) private UUID returnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_id", nullable = false)
    private SaleReturn saleReturn;

    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id") private UUID variantId;

    @Column(name = "product_name_snapshot", nullable = false) private String productNameSnapshot;
    @Column(name = "unit_price", nullable = false) private BigDecimal unitPrice;
    @Column(name = "qty",        nullable = false) private BigDecimal qty;
    @Column(name = "line_total", nullable = false) private BigDecimal lineTotal;

    @PrePersist
    void onCreate() { if (id == null) id = UUID.randomUUID(); }
}
