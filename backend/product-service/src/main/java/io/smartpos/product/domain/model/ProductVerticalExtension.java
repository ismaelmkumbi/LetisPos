package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-product, per-vertical extension data.
 * Core Product stays clean; pharmacy/hardware/etc. fields live here as JSONB.
 */
@Entity
@Table(name = "product_vertical_extensions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVerticalExtension {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "vertical_key", nullable = false, length = 50)
    private String verticalKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "JSONB", nullable = false)
    private String data; // JSON string

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
