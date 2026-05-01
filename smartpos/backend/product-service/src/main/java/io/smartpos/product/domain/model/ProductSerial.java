package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Tracks a single serialized unit (Serial / IMEI / MAC).
 * Status moves: IN_STOCK → RESERVED → SOLD; or RETURNED / DEFECTIVE.
 *
 * The {@code warehouseId} references inventory-service.warehouses by UUID
 * but is not constrained at the DB level (no cross-service FKs).
 */
@Entity
@Table(name = "product_serials")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ProductSerial {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "warehouse_id")
    private UUID warehouseId;

    @Column(name = "serial_number", nullable = false)
    private String serialNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "serial_type", nullable = false)
    @Builder.Default
    private SerialType serialType = SerialType.SERIAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SerialStatus status = SerialStatus.IN_STOCK;

    @Column(name = "purchase_ref") private String purchaseRef;
    @Column(name = "sale_ref")     private String saleRef;
    @Column(name = "warranty_start") private LocalDate warrantyStart;
    @Column(name = "warranty_end")   private LocalDate warrantyEnd;
    @Column(name = "notes") private String notes;

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
