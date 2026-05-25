package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AiAnalyticsDtos;
import io.smartpos.ai.application.CustomerAnalyticsService;
import io.smartpos.ai.application.ForecastingService;
import io.smartpos.ai.application.FraudDetectionService;
import io.smartpos.ai.application.KnowledgeBase;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiAnalyticsController {

    private final ForecastingService forecastingService;
    private final CustomerAnalyticsService customerAnalyticsService;
    private final FraudDetectionService fraudDetectionService;
    private final KnowledgeBase knowledgeBase;

    /**
     * Demand forecasting: top 10 products by projected demand using
     * Holt-Winters exponential smoothing (or 4-week simple moving
     * average fallback when data is sparse).
     */
    @GetMapping("/forecasting")
    @PreAuthorize("isAuthenticated()")
    public List<AiAnalyticsDtos.ForecastItem> forecasting(@AuthenticationPrincipal Jwt jwt) {
        log.debug("GET /api/v1/ai/forecasting called by user={}", jwt != null ? jwt.getSubject() : "anonymous");
        return forecastingService.generateForecast(TenantContext.get().orElse(null));
    }

    /**
     * Customer analytics: RFM segmentation, repeat rate, churn risk,
     * and top 10 customers by total spent.
     */
    @GetMapping("/customer-analytics")
    @PreAuthorize("isAuthenticated()")
    public AiAnalyticsDtos.CustomerAnalyticsResponse customerAnalytics(@AuthenticationPrincipal Jwt jwt) {
        log.debug("GET /api/v1/ai/customer-analytics called by user={}", jwt != null ? jwt.getSubject() : "anonymous");
        return customerAnalyticsService.analyze(TenantContext.get().orElse(null));
    }

    /**
     * Fraud detection: rule-based scanning of recent transactions
     * for discounts, voids, unusual hours, high values, and refunds.
     */
    @GetMapping("/fraud-detection")
    @PreAuthorize("isAuthenticated()")
    public List<AiAnalyticsDtos.FlaggedTransaction> fraudDetection(@AuthenticationPrincipal Jwt jwt) {
        log.debug("GET /api/v1/ai/fraud-detection called by user={}", jwt != null ? jwt.getSubject() : "anonymous");
        return fraudDetectionService.detectFraud(TenantContext.get().orElse(null));
    }

    @GetMapping("/knowledge/stats")
    @PreAuthorize("hasAuthority('ai.insight')")
    public Map<String, Object> knowledgeStats() {
        return knowledgeBase.stats();
    }
}
