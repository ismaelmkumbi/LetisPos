package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * GL journal-entry header. Lines are children; the entry must balance
 * (sum debits == sum credits) before it can be POSTED.
 *
 * Lifecycle:
 *   DRAFT  → editable, excluded from financial statements
 *   POSTED → immutable, contributes to Trial Balance / P&amp;L / Balance Sheet
 *   VOIDED → reversed (typically by posting a mirror entry); excluded from sums
 */
@Entity
@Table(name = "journal_entries")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class JournalEntry {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false)
    private String ref;

    @Column(name = "entry_date", nullable = false)
    @Builder.Default
    private LocalDate entryDate = LocalDate.now();

    @Column(name = "memo")
    private String memo;

    /** MANUAL | SALE | PURCHASE | EXPENSE | PAYROLL | ADJUSTMENT | OPENING. */
    @Column(name = "source", nullable = false)
    @Builder.Default
    private String source = "MANUAL";

    @Column(name = "source_ref")
    private String sourceRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private JournalStatus status = JournalStatus.DRAFT;

    @Column(name = "posted_at")  private Instant postedAt;
    @Column(name = "posted_by")  private UUID    postedBy;
    @Column(name = "voided_at")  private Instant voidedAt;
    @Column(name = "voided_by")  private UUID    voidedBy;
    @Column(name = "void_reason") private String voidReason;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_entry_id")
    @OrderBy("position ASC")
    @Builder.Default
    private List<JournalEntryLine> lines = new ArrayList<>();

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
