package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Feign client for the ai-service analytics endpoints.
 */
@FeignClient(name = "ai-service")
public interface AiFeign {

    record TopCustomer(
            UUID id,
            String name,
            BigDecimal totalSpent,
            int visits,
            LocalDate lastPurchase,
            String segment,
            double churnProbability   // 0.0-1.0
    ) {}

    record CustomerSegment(
            String label,
            long count,
            double percentage,
            String color
    ) {}

    record CustomerAnalyticsResponse(
            long totalCustomers,
            double repeatRate,
            BigDecimal avgOrderValue,
            double churnRisk,
            List<CustomerSegment> segments,
            List<TopCustomer> topCustomers
    ) {}

    // ── Forecasting ──────────────────────────────────────────────────────────

    record ForecastItem(
            UUID productId,
            String productName,
            int projectedDemand,
            int confidence,
            String trend,          // UP | DOWN | STABLE
            int weeksOfData
    ) {}

    // ── Fraud Detection ──────────────────────────────────────────────────────

    record FlaggedTransaction(
            String transactionId,
            BigDecimal amount,
            String type,          // High Discount | Rapid Voids | Refund Without Sale | After Hours | High Value
            int riskScore,        // 0-100
            List<String> reasons,
            Instant detectedAt,
            String status         // pending | reviewed | dismissed
    ) {}

    // ── API methods ──────────────────────────────────────────────────────────

    @GetMapping("/api/v1/ai/customer-analytics")
    CustomerAnalyticsResponse customerAnalytics();

    @GetMapping("/api/v1/ai/forecasting")
    List<ForecastItem> forecasting();

    @GetMapping("/api/v1/ai/fraud-detection")
    List<FlaggedTransaction> fraudDetection();

    @PostMapping("/api/v1/ai/narrate")
    Map<String, Object> narrate(@RequestBody Map<String, Object> request);
}
