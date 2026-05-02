package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * One node in the Chart of Accounts. Self-referential parent allows arbitrary
 * depth (typically 4-5 levels). Only {@code is_postable} leaves accept journal
 * entry lines; group nodes (e.g. "Assets", "Liabilities") are summary-only.
 */
@Entity
@Table(name = "chart_of_accounts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ChartOfAccount {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_class", nullable = false)
    private AccountClass accountClass;

    /** "DR" or "CR" — stored as String because it's a 2-char check-constrained code. */
    @Column(name = "normal_balance", nullable = false, length = 2)
    private String normalBalance;

    @Column(name = "is_postable", nullable = false)
    @Builder.Default
    private boolean postable = true;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "description")
    private String description;

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
        if (normalBalance == null) {
            // Default normal balance from the class — DR for ASSET/EXPENSE, CR otherwise.
            normalBalance = (accountClass == AccountClass.ASSET || accountClass == AccountClass.EXPENSE) ? "DR" : "CR";
        }
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
