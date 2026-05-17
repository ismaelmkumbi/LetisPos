package io.smartpos.ai.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTOs for AI analytics endpoints: forecasting, customer analytics, fraud detection.
 */
public final class AiAnalyticsDtos {

    private AiAnalyticsDtos() {}

    // ── Forecasting ──────────────────────────────────────────────────────────

    public record ForecastItem(
            UUID productId,
            String productName,
            String productCode,
            BigDecimal currentStock,
            int projectedDemand,
            int confidence,
            String trend,          // UP | DOWN | STABLE
            int weeksOfData,
            List<Integer> weeklyDemandHistory
    ) {}

    // ── Customer Analytics ───────────────────────────────────────────────────

    public record CustomerSegment(
            String label,
            long count,
            double percentage,
            String color          // CSS hex colour
    ) {}

    public record TopCustomer(
            UUID id,
            String name,
            BigDecimal totalSpent,
            int visits,
            LocalDate lastPurchase,
            String segment,        // Loyal | At Risk | Lost | New
            double churnProbability // 0.0-1.0
    ) {}

    public record CustomerAnalyticsResponse(
            long totalCustomers,
            double repeatRate,          // 0-100
            BigDecimal avgOrderValue,
            double churnRisk,           // 0-100
            List<CustomerSegment> segments,
            List<TopCustomer> topCustomers
    ) {}

    // ── Fraud Detection ──────────────────────────────────────────────────────

    public record FlaggedTransaction(
            String transactionId,
            BigDecimal amount,
            String type,          // High Discount | Rapid Voids | Refund Without Sale | After Hours | High Value
            int riskScore,        // 0-100
            List<String> reasons, // which rules triggered
            Instant detectedAt,
            String status         // pending | reviewed | dismissed
    ) {}
}
