package io.smartpos.hrm.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "payroll_runs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PayrollRun {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false) private String ref;
    @Column(name = "period_start", nullable = false) private LocalDate periodStart;
    @Column(name = "period_end",   nullable = false) private LocalDate periodEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PayrollStatus status = PayrollStatus.DRAFT;

    @Column(name = "total_gross", nullable = false) @Builder.Default private BigDecimal totalGross = BigDecimal.ZERO;
    @Column(name = "total_net",   nullable = false) @Builder.Default private BigDecimal totalNet   = BigDecimal.ZERO;

    @Column(name = "notes") private String notes;
    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "approved_at") private Instant approvedAt;
    @Column(name = "paid_at")     private Instant paidAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_run_id")
    @Builder.Default
    private List<PayrollLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public void recalcTotals() {
        totalGross = lines.stream()
                .map(l -> l.getBaseSalary().add(l.getAllowances()).add(l.getOvertime()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        totalNet = lines.stream().map(PayrollLine::getNetPay).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
