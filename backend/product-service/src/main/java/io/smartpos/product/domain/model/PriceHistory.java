package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "price_history")
@Getter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PriceHistory {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "field_name", nullable = false, length = 20)
    private String fieldName;

    @Column(name = "old_value")
    private BigDecimal oldValue;

    @Column(name = "new_value", nullable = false)
    private BigDecimal newValue;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (changedAt == null) changedAt = Instant.now();
    }
}
