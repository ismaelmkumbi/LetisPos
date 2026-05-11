package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "supplier_return_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SupplierReturnLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "return_id", insertable = false, updatable = false)
    private UUID returnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_id", nullable = false)
    private SupplierReturn returnRef;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "qty", nullable = false)
    @Builder.Default
    private BigDecimal qty = BigDecimal.ZERO;

    @Column(name = "unit_cost")
    private BigDecimal unitCost;

    @Column(name = "reason_code")
    private String reasonCode;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }
}
