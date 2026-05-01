package io.smartpos.hrm.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payroll_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PayrollLine {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "employee_id", nullable = false) private UUID employeeId;

    @Column(name = "base_salary", nullable = false) @Builder.Default private BigDecimal baseSalary = BigDecimal.ZERO;
    @Column(name = "allowances",  nullable = false) @Builder.Default private BigDecimal allowances = BigDecimal.ZERO;
    @Column(name = "deductions",  nullable = false) @Builder.Default private BigDecimal deductions = BigDecimal.ZERO;
    @Column(name = "overtime",    nullable = false) @Builder.Default private BigDecimal overtime = BigDecimal.ZERO;
    @Column(name = "tax",         nullable = false) @Builder.Default private BigDecimal tax = BigDecimal.ZERO;
    @Column(name = "net_pay",     nullable = false) @Builder.Default private BigDecimal netPay = BigDecimal.ZERO;

    @Column(name = "paid_at") private Instant paidAt;
    @Column(name = "payment_ref") private String paymentRef;
    @Column(name = "notes") private String notes;

    @PrePersist
    void onCreate() { if (id == null) id = UUID.randomUUID(); }

    /** Net = base + allowances + overtime - deductions - tax. Idempotent. */
    public void recalcNet() {
        netPay = baseSalary.add(allowances).add(overtime).subtract(deductions).subtract(tax);
    }
}
