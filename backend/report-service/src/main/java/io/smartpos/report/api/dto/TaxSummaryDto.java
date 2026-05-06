package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record TaxSummaryDto(
        LocalDate from, LocalDate to,
        BigDecimal totalTax,
        BigDecimal taxableSales,
        long transactionCount,
        List<TaxByRate> byRate,
        List<TaxByCategory> byCategory
) {
    public record TaxByRate(BigDecimal rate, BigDecimal taxAmount, BigDecimal taxableAmount, long count) {}
    public record TaxByCategory(String categoryName, BigDecimal taxAmount, BigDecimal taxableAmount, long count) {}
}
