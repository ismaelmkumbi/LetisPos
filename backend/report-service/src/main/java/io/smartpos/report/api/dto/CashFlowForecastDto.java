package io.smartpos.report.api.dto;

import java.util.List;

public record CashFlowForecastDto(
    List<DailyProjection> dailyProjections,
    long openingBalance,
    long lowestBalance,
    String lowestBalanceDate,
    long safetyThreshold
) {
    public record DailyProjection(
        String date, long openingBalance, long inflows,
        long outflows, long closingBalance, boolean isDangerDay
    ) {}
}
