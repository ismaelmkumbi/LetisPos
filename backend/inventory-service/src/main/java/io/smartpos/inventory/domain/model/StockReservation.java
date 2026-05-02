package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * An in-flight sale holding stock. Uniquely keyed by {@code sale_id} so clients
 * can safely retry the reservation request (idempotent).
 *
 * The {@code lines} JSONB stores the reserved rows so expiry / release /
 * commit can iterate them without an additional table.
 */
@Entity
@Table(name = "stock_reservations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StockReservation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sale_id", nullable = false, unique = true)
    private UUID saleId;

    /** JSON array of {productId, variantId, warehouseId, qty} — see ReservationLine. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "lines", nullable = false, columnDefinition = "jsonb")
    private String linesJson;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.ACTIVE;

    @Column(name = "user_id")  private UUID userId;
    @Column(name = "tenant_id") private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "committed_at") private Instant committedAt;
    @Column(name = "released_at")  private Instant releasedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public boolean isActive() { return status == ReservationStatus.ACTIVE; }
}
