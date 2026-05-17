package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "ai-service")
public interface AiFeign {

    record ForecastItem(
        UUID productId, String productName, String productCode,
        BigDecimal currentStock, int projectedDemand, int confidence,
        String trend, int weeksOfData, List<Integer> weeklyDemandHistory
    ) {}

    @GetMapping("/api/v1/ai/forecasting")
    List<ForecastItem> forecasting();

    record CustomerSegment(String label, long count, double percentage, String color) {}

    record TopCustomer(UUID id, String name, BigDecimal totalSpent,
                       int visits, LocalDate lastPurchase, String segment) {}

    record CustomerAnalyticsResponse(
        long totalCustomers, double repeatRate, BigDecimal avgOrderValue,
        double churnRisk, List<CustomerSegment> segments, List<TopCustomer> topCustomers
    ) {}

    @GetMapping("/api/v1/ai/customer-analytics")
    CustomerAnalyticsResponse customerAnalytics();

    record FlaggedTransaction(
        String transactionId, BigDecimal amount, String type,
        int riskScore, List<String> reasons, Instant detectedAt, String status
    ) {}

    @GetMapping("/api/v1/ai/fraud-detection")
    List<FlaggedTransaction> fraudDetection();

    @GetMapping("/api/v1/ai/health")
    Map<String, Object> health();
}
