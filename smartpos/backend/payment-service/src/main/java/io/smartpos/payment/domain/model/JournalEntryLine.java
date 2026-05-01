package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One DR or CR posting line. The DB-side check {@code (debit > 0) <> (credit > 0)}
 * enforces "exactly one of debit / credit must be positive" — the entity layer
 * doesn't re-check this.
 */
@Entity
@Table(name = "journal_entry_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JournalEntryLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "debit", nullable = false)
    @Builder.Default
    private BigDecimal debit = BigDecimal.ZERO;

    @Column(name = "credit", nullable = false)
    @Builder.Default
    private BigDecimal credit = BigDecimal.ZERO;

    @Column(name = "memo")
    private String memo;

    @Column(name = "position", nullable = false)
    @Builder.Default
    private int position = 0;

    @PrePersist
    void onCreate() { if (id == null) id = UUID.randomUUID(); }
}
