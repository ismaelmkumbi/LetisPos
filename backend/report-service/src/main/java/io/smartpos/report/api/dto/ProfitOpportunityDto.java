package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProfitOpportunityDto(
    List<OpportunityEntry> opportunities,
    BigDecimal totalEstimatedMonthlyImpact
) {
    public record OpportunityEntry(
        UUID productId, String productName, String category,
        BigDecimal currentMargin, int unitsSold30d,
        BigDecimal estimatedMonthlyImpact, String reason
    ) {}
}
