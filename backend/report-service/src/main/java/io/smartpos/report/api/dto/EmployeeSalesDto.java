package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record EmployeeSalesDto(
        LocalDate from, LocalDate to,
        List<EmployeeRow> rows
) {
    public record EmployeeRow(UUID employeeId, String employeeName, long saleCount, BigDecimal totalNet, BigDecimal totalGross, long itemsSold) {}
}
