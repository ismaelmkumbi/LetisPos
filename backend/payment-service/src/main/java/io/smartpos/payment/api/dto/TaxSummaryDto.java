package io.smartpos.payment.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record TaxSummaryDto(
        BigDecimal thisMonth,
        BigDecimal thisQuarter,
        BigDecimal thisYear,
        List<Breakdown> breakdown
) {
    public record Breakdown(
            UUID taxRateId,
            String name,
            BigDecimal rate,
            BigDecimal collected
    ) {}
}
