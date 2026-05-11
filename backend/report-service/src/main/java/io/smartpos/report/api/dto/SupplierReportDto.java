package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SupplierReportDto(
    long totalSuppliers,
    BigDecimal totalSpend,
    List<SupplierSpendRow> topSuppliers,
    List<SupplierPerformanceRow> performance
) {
    public record SupplierSpendRow(UUID supplierId, String supplierName, BigDecimal totalSpend, int orderCount) {}

    public record SupplierPerformanceRow(UUID supplierId, String supplierName, double onTimeDeliveryPct, int returnCount, BigDecimal totalSpend) {}
}
