package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "product_batches")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProductBatch {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "batch_number", nullable = false, length = 80)
    private String batchNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "qty", nullable = false)
    @Builder.Default
    private int qty = 0;

    @Column(name = "warehouse_id")
    private UUID warehouseId;

    @Column(name = "notes")
    private String notes;

    @Column(name = "tenant_id")
    private UUID tenantId;

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
