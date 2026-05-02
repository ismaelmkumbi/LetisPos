package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "account_ledger")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LedgerEntry {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "account_id", nullable = false) private UUID accountId;

    @Column(name = "txn_date", nullable = false)
    @Builder.Default
    private LocalDate txnDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type")
    private ReferenceType referenceType;

    @Column(name = "reference_id") private UUID referenceId;
    @Column(name = "description")  private String description;

    @Column(name = "debit",  nullable = false) @Builder.Default private BigDecimal debit  = BigDecimal.ZERO;
    @Column(name = "credit", nullable = false) @Builder.Default private BigDecimal credit = BigDecimal.ZERO;

    @Column(name = "balance_after", nullable = false) private BigDecimal balanceAfter;

    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
