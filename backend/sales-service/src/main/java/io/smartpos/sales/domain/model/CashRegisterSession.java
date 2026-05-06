package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cash_register_sessions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CashRegisterSession {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "warehouse_id", nullable = false)
    private UUID warehouseId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "opened_at", nullable = false, updatable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "opening_balance", nullable = false)
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(name = "counted_cash")
    private BigDecimal countedCash;

    @Column(name = "expected_cash", nullable = false)
    @Builder.Default
    private BigDecimal expectedCash = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private CashRegisterStatus status = CashRegisterStatus.OPEN;

    @Column(name = "notes")
    private String notes;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (openedAt == null) openedAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void close(BigDecimal countedCash, String notes, BigDecimal expectedCash) {
        this.status = CashRegisterStatus.CLOSED;
        this.closedAt = Instant.now();
        this.countedCash = countedCash;
        this.expectedCash = expectedCash;
        this.notes = notes;
    }
}
