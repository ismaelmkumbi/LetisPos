package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "quotation_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class QuotationLine {

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "quotation_id", insertable = false, updatable = false) private UUID quotationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id")                   private UUID variantId;

    @Column(name = "product_name_snapshot", nullable = false) private String productNameSnapshot;
    @Column(name = "product_code_snapshot")                   private String productCodeSnapshot;

    @Column(name = "unit_price", nullable = false) private BigDecimal unitPrice;
    @Column(name = "qty",        nullable = false) private BigDecimal qty;

    @Column(name = "discount", nullable = false) @Builder.Default private BigDecimal discount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false)
    @Builder.Default
    private DiscountType discountType = DiscountType.FIXED;

    @Column(name = "tax_rate", nullable = false) @Builder.Default private BigDecimal taxRate = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method", nullable = false)
    @Builder.Default
    private TaxMethod taxMethod = TaxMethod.EXCLUSIVE;

    @Column(name = "line_subtotal", nullable = false) private BigDecimal lineSubtotal;
    @Column(name = "line_tax",      nullable = false) @Builder.Default private BigDecimal lineTax = BigDecimal.ZERO;
    @Column(name = "line_total",    nullable = false) private BigDecimal lineTotal;

    @PrePersist
    void onCreate() { if (id == null) id = UUID.randomUUID(); }
}
