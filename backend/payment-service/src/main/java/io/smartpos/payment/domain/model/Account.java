package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Account {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false) private String name;
    @Column(name = "number") private String number;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @Builder.Default
    private AccountType type = AccountType.CASH;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "TZS";

    @Column(name = "initial_balance", nullable = false)
    @Builder.Default
    private BigDecimal initialBalance = BigDecimal.ZERO;

    @Column(name = "balance", nullable = false)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "coa_id")
    private UUID coaId;

    @Column(name = "notes") private String notes;
    @Column(name = "tenant_id") private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    /** Post a signed delta to the balance. Used only within a pessimistic-locked tx. */
    public BigDecimal applyDelta(BigDecimal delta) {
        BigDecimal next = balance.add(delta);
        this.balance = next;
        return next;
    }
}
