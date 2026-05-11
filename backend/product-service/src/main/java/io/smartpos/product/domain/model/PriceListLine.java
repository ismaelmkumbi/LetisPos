package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "price_list_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PriceListLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "price_list_id", insertable = false, updatable = false)
    private UUID priceListId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "price", nullable = false, precision = 19, scale = 4)
    private BigDecimal price;

    @Column(name = "min_qty", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal minQty = BigDecimal.ONE;

    @Column(name = "max_qty", precision = 12, scale = 3)
    private BigDecimal maxQty;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
