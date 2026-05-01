package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SalesSummaryDto(
        LocalDate from, LocalDate to,
        long count,
        BigDecimal gross, BigDecimal tax, BigDecimal discount,
        BigDecimal net, BigDecimal paid, BigDecimal due,
        BigDecimal avgSale,
        List<DashboardDto.SeriesPoint> series
) {}
