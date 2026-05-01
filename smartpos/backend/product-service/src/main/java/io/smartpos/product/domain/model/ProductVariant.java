package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_variants")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    /** Owning product FK, set by Product via @JoinColumn on the collection. */
    @Column(name = "product_id", insertable = false, updatable = false)
    private UUID productId;

    @Column(name = "name", nullable = false)  private String name;
    @Column(name = "code")                    private String code;
    @Column(name = "cost")                    private BigDecimal cost;
    @Column(name = "price")                   private BigDecimal price;
    @Column(name = "wholesale_price")         private BigDecimal wholesalePrice;
    @Column(name = "min_price")               private BigDecimal minPrice;
    @Column(name = "image_url")               private String imageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
