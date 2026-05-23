package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Sale aggregate root.
 *
 * Lifecycle:
 *   DRAFT       — created, totals computed, nothing reserved yet
 *   CONFIRMED   — stock reserved (via Inventory saga) and sale stored
 *   CANCELLED   — reservation released
 *   RETURNED    — a SaleReturn has fully refunded this sale
 *
 * PaymentStatus is denormalised from the Payment Service (updated via events).
 */
@Entity
@Table(name = "sales")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Sale {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false)
    private String ref;

    @Column(name = "date", nullable = false)
    @Builder.Default
    private LocalDate date = LocalDate.now();

    @Column(name = "customer_id")  private UUID customerId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "user_id")      private UUID userId;

    @Column(name = "is_pos", nullable = false)
    @Builder.Default
    private boolean pos = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SaleStatus status = SaleStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "subtotal",       nullable = false) @Builder.Default private BigDecimal subtotal       = BigDecimal.ZERO;
    @Column(name = "tax_total",      nullable = false) @Builder.Default private BigDecimal taxTotal       = BigDecimal.ZERO;
    @Column(name = "tax_rate",       nullable = false) @Builder.Default private BigDecimal taxRate        = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_method", nullable = false)
    @Builder.Default
    private TaxMethod taxMethod = TaxMethod.EXCLUSIVE;

    @Column(name = "discount_total", nullable = false) @Builder.Default private BigDecimal discountTotal  = BigDecimal.ZERO;
    @Column(name = "shipping",       nullable = false) @Builder.Default private BigDecimal shipping       = BigDecimal.ZERO;
    @Column(name = "grand_total",    nullable = false) @Builder.Default private BigDecimal grandTotal     = BigDecimal.ZERO;
    @Column(name = "paid_total",     nullable = false) @Builder.Default private BigDecimal paidTotal      = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3) @Builder.Default private String     currency      = "TZS";
    @Column(name = "exchange_rate", nullable = false) @Builder.Default private BigDecimal exchangeRate  = BigDecimal.ONE;

    @Column(name = "notes")     private String notes;
    @Column(name = "tenant_id") private UUID   tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "confirmed_at") private Instant confirmedAt;
    @Column(name = "cancelled_at") private Instant cancelledAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    @Builder.Default
    private List<SaleLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public boolean isDraft()     { return status == SaleStatus.DRAFT; }
    public boolean isConfirmed() { return status == SaleStatus.CONFIRMED; }

    public void confirm() {
        if (!isDraft()) throw new IllegalStateException("Sale is already " + status);
        this.status = SaleStatus.CONFIRMED;
        this.confirmedAt = Instant.now();
    }

    public void cancel() {
        if (status == SaleStatus.CANCELLED) return;          // idempotent
        if (status == SaleStatus.RETURNED) throw new IllegalStateException("Sale is RETURNED");
        this.status = SaleStatus.CANCELLED;
        this.cancelledAt = Instant.now();
    }

    /** Updates payment_status based on paid_total vs grand_total. */
    public void recomputePaymentStatus() {
        int cmp = paidTotal.compareTo(grandTotal);
        if (paidTotal.signum() == 0)       paymentStatus = PaymentStatus.UNPAID;
        else if (cmp < 0)                  paymentStatus = PaymentStatus.PARTIAL;
        else                               paymentStatus = PaymentStatus.PAID;
    }
}
