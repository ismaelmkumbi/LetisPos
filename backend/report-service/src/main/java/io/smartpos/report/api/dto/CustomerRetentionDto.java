package io.smartpos.report.api.dto;

import java.util.List;
import java.util.UUID;

public record CustomerRetentionDto(
    List<AtRiskCustomer> atRiskCustomers,
    long totalAtRiskRevenue,
    long totalCustomers,
    double churnRisk
) {
    public record AtRiskCustomer(
        UUID customerId, String name, long lastVisitDays,
        long lifetimeValue, String segment, int visits
    ) {}
}
