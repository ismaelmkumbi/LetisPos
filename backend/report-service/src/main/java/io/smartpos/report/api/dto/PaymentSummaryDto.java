package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PaymentSummaryDto(
        LocalDate from, LocalDate to,
        long totalCount,
        BigDecimal totalIn, BigDecimal totalOut, BigDecimal netFlow,
        BigDecimal outstanding,
        List<DashboardDto.SeriesPoint> inflowSeries,
        List<ByMethod> byMethod
) {
    public record ByMethod(String method, BigDecimal total, long count) {}
}
