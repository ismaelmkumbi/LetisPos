package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quotations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Quotation {

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "ref", nullable = false) private String ref;

    @Column(name = "date", nullable = false)
    @Builder.Default
    private LocalDate date = LocalDate.now();

    @Column(name = "customer_id")               private UUID customerId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "user_id")                   private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private QuotationStatus status = QuotationStatus.DRAFT;

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
    @Column(name = "currency", nullable = false, length = 3) @Builder.Default private String     currency       = "TZS";
    @Column(name = "exchange_rate",  nullable = false) @Builder.Default private BigDecimal exchangeRate   = BigDecimal.ONE;

    @Column(name = "notes")             private String notes;
    @Column(name = "converted_sale_id") private UUID   convertedSaleId;
    @Column(name = "tenant_id")         private UUID   tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<QuotationLine> lines = new ArrayList<>();

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
