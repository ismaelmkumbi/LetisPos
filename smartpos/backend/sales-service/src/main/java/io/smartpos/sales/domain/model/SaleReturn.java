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
@Table(name = "sale_returns")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SaleReturn {

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "ref", nullable = false) private String ref;
    @Column(name = "date", nullable = false)
    @Builder.Default
    private LocalDate date = LocalDate.now();

    @Column(name = "sale_id", nullable = false) private UUID saleId;
    @Column(name = "customer_id")               private UUID customerId;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "user_id")                   private UUID userId;

    @Column(name = "reason") private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.CONFIRMED;

    @Column(name = "subtotal",    nullable = false) @Builder.Default private BigDecimal subtotal    = BigDecimal.ZERO;
    @Column(name = "tax_total",   nullable = false) @Builder.Default private BigDecimal taxTotal    = BigDecimal.ZERO;
    @Column(name = "grand_total", nullable = false) @Builder.Default private BigDecimal grandTotal  = BigDecimal.ZERO;

    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @OneToMany(mappedBy = "saleReturn", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SaleReturnLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
