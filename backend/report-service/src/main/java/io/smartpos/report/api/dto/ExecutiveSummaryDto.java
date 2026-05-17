package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record ExecutiveSummaryDto(
    List<BulletPoint> bullets,
    KpiSnapshot kpiSnapshot,
    AlertSummary alertSummary,
    String provider          // "template" | "llm"
) {
    public record BulletPoint(
        String category,     // "HEADLINE" | "CHANGE" | "ATTENTION" | "RECOMMENDATION"
        String text,
        String linkTo        // optional: "kpiGrid", "revenueChart", "inventory", "customers", null
    ) {}

    public record KpiSnapshot(
        BigDecimal revenue,
        BigDecimal netProfit,
        long orderCount,
        BigDecimal profitMargin,   // percentage value, e.g. 18.5
        long lowStockLines,
        long totalCustomers,
        double churnRisk,          // 0.0-1.0 from CustomerAnalyticsResponse
        double repeatRate          // 0-100 from CustomerAnalyticsResponse
    ) {}

    public record AlertSummary(
        int fraudAlerts,
        int stockAlerts,
        int paymentAlerts
    ) {}
}
