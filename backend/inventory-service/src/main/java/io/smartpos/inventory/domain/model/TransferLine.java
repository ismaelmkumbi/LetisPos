package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "transfer_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TransferLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "transfer_id", insertable = false, updatable = false)
    private UUID transferId;

    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id")                   private UUID variantId;
    @Column(name = "qty", nullable = false)        private BigDecimal qty;
    @Column(name = "unit_cost")                    private BigDecimal unitCost;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }
}
