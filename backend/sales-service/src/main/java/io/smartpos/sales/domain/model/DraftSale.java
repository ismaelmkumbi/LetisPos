package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "draft_sales")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DraftSale {

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "user_id",      nullable = false) private UUID userId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "customer_id")                    private UUID customerId;

    @Column(name = "label") private String label;

    /** Whole cart payload (lines, customer, pending notes, …). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", nullable = false, columnDefinition = "jsonb")
    private String data;

    @Column(name = "tenant_id") private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

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
