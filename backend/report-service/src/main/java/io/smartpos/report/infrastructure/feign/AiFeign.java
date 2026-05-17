package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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

    @GetMapping("/api/v1/ai/customer-analytics")
    CustomerAnalyticsResponse customerAnalytics();
}
