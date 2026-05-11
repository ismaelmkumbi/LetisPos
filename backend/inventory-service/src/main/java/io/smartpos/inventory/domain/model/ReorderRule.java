package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reorder_rules")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReorderRule {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "product_id", nullable = false) private UUID productId;
    @Column(name = "variant_id") private UUID variantId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "min_qty", nullable = false) private BigDecimal minQty;
    @Column(name = "reorder_qty", nullable = false)
    @Builder.Default
    private BigDecimal reorderQty = BigDecimal.ONE;
    @Column(name = "supplier_id") private UUID supplierId;
    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
