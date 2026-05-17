package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "recurring_invoice_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RecurringInvoiceLine {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id") private UUID variantId;
    @Column(name = "product_name_snapshot") private String productNameSnapshot;
    @Column(name = "product_code_snapshot") private String productCodeSnapshot;

    @Column(name = "qty", nullable = false)
    @Builder.Default
    private BigDecimal qty = BigDecimal.ONE;

    @Column(name = "unit_price", nullable = false) private BigDecimal unitPrice;

    @Column(name = "discount") private BigDecimal discount;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType;

    @Column(name = "tax_rate") private BigDecimal taxRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method")
    private TaxMethod taxMethod;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private int position = 0;

    @Column(name = "recurring_invoice_id")
    private UUID recurringInvoiceId;

    @PrePersist
    void onCreate() { if (id == null) id = UUID.randomUUID(); }
}
