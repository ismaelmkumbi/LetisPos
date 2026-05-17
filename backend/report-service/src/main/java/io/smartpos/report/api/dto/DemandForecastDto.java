package io.smartpos.report.api.dto;

import java.util.List;
import java.util.UUID;

public record DemandForecastDto(
    List<ForecastEntry> forecast,
    long aggregateProjectedRevenue,
    String dataStartDate,
    String dataEndDate
) {
    public record ForecastEntry(
        UUID productId, String productName, int projectedDemand,
        int confidence, String trend, int weeksOfData
    ) {}
}
