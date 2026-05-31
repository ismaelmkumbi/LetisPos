package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Purchase = mirror of Sale but with a supplier instead of a customer.
 * RECEIVING a purchase increments inventory (uses AdjustmentService on Inventory
 * since Phase 3 doesn't have a dedicated "purchase-in" endpoint; the adjustment
 * movement carries reference_type=PURCHASE as a bookkeeping hint).
 */
@Entity
@Table(name = "purchases")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Purchase {

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "ref", nullable = false) private String ref;

    @Column(name = "date", nullable = false)
    @Builder.Default
    private LocalDate date = LocalDate.now();

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "supplier_id")                   private UUID supplierId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "user_id")                       private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PurchaseStatus status = PurchaseStatus.DRAFT;

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
    @Column(name = "currency", nullable = false, length = 3) @Builder.Default private String     currency       = "TZS";
    @Column(name = "exchange_rate",  nullable = false) @Builder.Default private BigDecimal exchangeRate   = BigDecimal.ONE;

    @Column(name = "notes")     private String notes;
    @Column(name = "tenant_id") private UUID   tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "received_at") private Instant receivedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PurchaseLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public void receive() {
        if (status == PurchaseStatus.RECEIVED) return;
        if (status == PurchaseStatus.CANCELLED) throw new IllegalStateException("Purchase is cancelled");
        this.status = PurchaseStatus.RECEIVED;
        this.receivedAt = Instant.now();
    }

    public void cancel() {
        if (status == PurchaseStatus.CANCELLED) return;
        this.status = PurchaseStatus.CANCELLED;
    }

    public void recomputePaymentStatus() {
        if (paidTotal.signum() == 0)                      paymentStatus = PaymentStatus.UNPAID;
        else if (paidTotal.compareTo(grandTotal) < 0)     paymentStatus = PaymentStatus.PARTIAL;
        else                                              paymentStatus = PaymentStatus.PAID;
    }
}
