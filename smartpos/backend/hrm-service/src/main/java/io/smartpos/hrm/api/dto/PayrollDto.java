package io.smartpos.hrm.api.dto;

import io.smartpos.hrm.domain.model.PayrollLine;
import io.smartpos.hrm.domain.model.PayrollRun;
import io.smartpos.hrm.domain.model.PayrollStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PayrollDto(
        UUID id, String ref, LocalDate periodStart, LocalDate periodEnd,
        PayrollStatus status, BigDecimal totalGross, BigDecimal totalNet,
        String notes, Instant approvedAt, Instant paidAt, List<LineDto> lines
) {
    public static PayrollDto from(PayrollRun r) {
        return new PayrollDto(r.getId(), r.getRef(), r.getPeriodStart(), r.getPeriodEnd(),
                r.getStatus(), r.getTotalGross(), r.getTotalNet(), r.getNotes(),
                r.getApprovedAt(), r.getPaidAt(),
                r.getLines().stream().map(LineDto::from).toList());
    }

    public record LineDto(UUID id, UUID employeeId,
                          BigDecimal baseSalary, BigDecimal allowances, BigDecimal deductions,
                          BigDecimal overtime, BigDecimal tax, BigDecimal netPay,
                          Instant paidAt, String paymentRef, String notes) {
        public static LineDto from(PayrollLine l) {
            return new LineDto(l.getId(), l.getEmployeeId(),
                    l.getBaseSalary(), l.getAllowances(), l.getDeductions(),
                    l.getOvertime(), l.getTax(), l.getNetPay(),
                    l.getPaidAt(), l.getPaymentRef(), l.getNotes());
        }
    }

    public record CreateRequest(
            @NotBlank @Size(max = 50) String ref,
            @NotNull LocalDate periodStart,
            @NotNull LocalDate periodEnd,
            String notes,
            List<LineInput> lines
    ) {}

    public record LineInput(
            @NotNull UUID employeeId,
            BigDecimal baseSalary,
            BigDecimal allowances,
            BigDecimal deductions,
            BigDecimal overtime,
            BigDecimal tax
    ) {}
}
