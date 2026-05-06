package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseSummaryDto(
        LocalDate from, LocalDate to,
        long count,
        BigDecimal gross, BigDecimal paid, BigDecimal due,
        BigDecimal avgPurchase,
        List<DashboardDto.SeriesPoint> series,
        List<TopSupplier> topSuppliers
) {
    public record TopSupplier(UUID supplierId, String supplierName, long orderCount, BigDecimal totalSpent) {}
}
