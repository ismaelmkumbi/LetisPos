package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Template + schedule for an invoice that materialises into Sales on a cadence.
 *
 * Lifecycle:
 *   ACTIVE      → eligible for generation when next_run_date <= today
 *   PAUSED      → skipped by the scheduler; resume by flipping back to ACTIVE
 *   COMPLETED   → reached end_date or occurrences_max
 *   CANCELLED   → user-cancelled; never runs again
 */
@Entity
@Table(name = "recurring_invoices")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RecurringInvoice {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false) private String ref;
    @Column(name = "name") private String name;
    @Column(name = "customer_id") private UUID customerId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false)
    private RecurringFrequency frequency;

    @Column(name = "interval_count", nullable = false)
    @Builder.Default
    private int intervalCount = 1;

    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "end_date")   private LocalDate endDate;
    @Column(name = "next_run_date", nullable = false) private LocalDate nextRunDate;
    @Column(name = "last_run_date") private LocalDate lastRunDate;
    @Column(name = "occurrences_max") private Integer occurrencesMax;

    @Column(name = "occurrences_count", nullable = false)
    @Builder.Default
    private int occurrencesCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private RecurringStatus status = RecurringStatus.ACTIVE;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "TZS";

    @Column(name = "discount") private BigDecimal discount;
    @Column(name = "shipping") private BigDecimal shipping;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method")
    private TaxMethod taxMethod;

    @Column(name = "notes") private String notes;

    @Column(name = "send_notification", nullable = false)
    @Builder.Default
    private boolean sendNotification = true;

    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "recurring_invoice_id")
    @OrderBy("position ASC")
    @Builder.Default
    private List<RecurringInvoiceLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (nextRunDate == null) nextRunDate = startDate;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public void softDelete() {
        deletedAt = Instant.now();
        status = RecurringStatus.CANCELLED;
    }
}
