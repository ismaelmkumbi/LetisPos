package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.DashboardIntelligenceDto;
import io.smartpos.report.api.dto.ExecutiveSummaryDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.api.dto.UnifiedResponse;
import io.smartpos.report.api.dto.UnifiedResponse.*;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.*;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardIntelligenceService {

    private final SalesFeign sales;
    private final InventoryFeign inventory;
    private final PaymentFeign payments;
    private final AiFeign ai;
    private final DataFreshnessService freshness;
    private final DashboardService dashboardService;

    /**
     * Lightweight health/status check. Pings each downstream service,
     * collects data freshness metadata, and returns a unified response.
     */
    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD_INTELLIGENCE,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('status')")
    public UnifiedResponse<DashboardIntelligenceDto> status() {
        TenantContext.require();

        boolean aiOk    = pingAi();
        boolean salesOk = pingSales();
        boolean invOk   = pingInventory();
        boolean payOk   = pingPayments();

        boolean degraded = !aiOk || !salesOk || !invOk || !payOk;

        DashboardIntelligenceDto dto = new DashboardIntelligenceDto(
            "report-service",
            "0.1.0-SNAPSHOT",
            Instant.now(),
            aiOk, salesOk, invOk, payOk
        );

        DataFreshnessMap fm = freshness.currentFreshness();
        List<Alert> alerts = freshness.buildAlerts(fm);

        ResponseMeta meta = new ResponseMeta(Instant.now(), fm, alerts);

        return degraded
            ? UnifiedResponse.degraded(dto, meta)
            : UnifiedResponse.ok(dto, meta);
    }

    // ---- Executive Summary ----

    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD_EXECUTIVE_SUMMARY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('exec', #date)")
    public UnifiedResponse<ExecutiveSummaryDto> executiveSummary(
        @org.springframework.lang.Nullable LocalDate date) {

        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        TenantContext.require();

        // Gather all data with safe wrappers
        DashboardDto today = safeDashboard(null, Period.TODAY);
        DashboardDto yesterday = safeDashboard(null, Period.YESTERDAY);
        AiFeign.CustomerAnalyticsResponse cust = safeCustomerAnalytics();
        List<AiFeign.FlaggedTransaction> fraud = safeFraudAlerts();

        // Try LLM first, fall back to template
        ExecutiveSummaryDto result = tryLlm(effectiveDate, today, yesterday, cust, fraud);
        if (result == null) {
            result = buildTemplate(today, yesterday, cust, fraud);
        }

        DataFreshnessMap fm = freshness.currentFreshness();
        List<Alert> alerts = freshness.buildAlerts(fm);
        ResponseMeta meta = new ResponseMeta(Instant.now(), fm, alerts);

        return UnifiedResponse.ok(result, meta);
    }

    /** Uncached version for refresh param */
    public UnifiedResponse<ExecutiveSummaryDto> executiveSummaryUncached(
        @org.springframework.lang.Nullable LocalDate date) {
        return executiveSummary(date);  // self-invocation bypasses cache interceptor
    }

    // ---- Safe wrappers ----

    private DashboardDto safeDashboard(UUID warehouseId, Period period) {
        try { return dashboardService.dashboard(warehouseId, period); }
        catch (Exception e) { log.warn("Dashboard fetch failed for {}: {}", period, e.getMessage()); return zeroDashboard(); }
    }

    private AiFeign.CustomerAnalyticsResponse safeCustomerAnalytics() {
        try { return ai.customerAnalytics(); }
        catch (Exception e) { log.warn("Customer analytics failed: {}", e.getMessage()); return zeroCustomerAnalytics(); }
    }

    private List<AiFeign.FlaggedTransaction> safeFraudAlerts() {
        try { return ai.fraudDetection(); }
        catch (Exception e) { log.warn("Fraud detection failed: {}", e.getMessage()); return List.of(); }
    }

    // ---- Zero-value fallback objects ----

    private DashboardDto zeroDashboard() {
        return new DashboardDto(LocalDate.now(), LocalDate.now(),
            new DashboardDto.Sales(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
            new DashboardDto.Purchases(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
            new DashboardDto.Payments(0, BigDecimal.ZERO, BigDecimal.ZERO),
            new DashboardDto.Expenses(BigDecimal.ZERO, 0),
            new DashboardDto.Inventory(0, BigDecimal.ZERO, BigDecimal.ZERO, 0),
            List.of(), List.of(), BigDecimal.ZERO);
    }

    private AiFeign.CustomerAnalyticsResponse zeroCustomerAnalytics() {
        return new AiFeign.CustomerAnalyticsResponse(0, 0.0, BigDecimal.ZERO, 0.0, List.of(), List.of());
    }

    // ---- LLM path (with 3-second timeout) ----

    private ExecutiveSummaryDto tryLlm(LocalDate date, DashboardDto today, DashboardDto yesterday,
                                        AiFeign.CustomerAnalyticsResponse cust,
                                        List<AiFeign.FlaggedTransaction> fraud) {
        try {
            var factsJson = buildFactsJson(date, today, yesterday, cust, fraud);
            var future = CompletableFuture
                .supplyAsync(() -> ai.narrate(new AiFeign.NarrateRequest("executive-summary", factsJson, null)))
                .orTimeout(3, TimeUnit.SECONDS);
            var response = future.get();
            return parseLlmResponse(response, today, cust, fraud);
        } catch (java.util.concurrent.TimeoutException e) {
            log.info("LLM executive summary timed out, falling back to template");
            return null;
        } catch (Exception e) {
            log.warn("LLM executive summary failed: {}", e.getMessage());
            return null;
        }
    }

    private String buildFactsJson(LocalDate date, DashboardDto today, DashboardDto yesterday,
                                   AiFeign.CustomerAnalyticsResponse cust,
                                   List<AiFeign.FlaggedTransaction> fraud) {
        return String.format(
            "{\"date\":\"%s\",\"revenue\":%.0f,\"profit\":%.0f,\"orders\":%d,\"avgOrderValue\":%.0f," +
            "\"lowStock\":%d,\"yesterdayRevenue\":%.0f,\"churnRisk\":%.2f,\"repeatRate\":%.1f," +
            "\"fraudAlerts\":%d,\"totalCustomers\":%d}",
            date, today.sales().net(), today.netProfit(), today.sales().count(),
            today.sales().count() > 0 ? today.sales().net().divide(BigDecimal.valueOf(today.sales().count()), 0, RoundingMode.HALF_UP) : BigDecimal.ZERO,
            today.inventory().lowStockLines(), yesterday.sales().net(),
            cust.churnRisk(), cust.repeatRate(), fraud.size(), cust.totalCustomers());
    }

    private ExecutiveSummaryDto parseLlmResponse(AiFeign.InsightResponse response, DashboardDto today,
                                                  AiFeign.CustomerAnalyticsResponse cust,
                                                  List<AiFeign.FlaggedTransaction> fraud) {
        String narrative = response.narrative();
        // Split by newlines/bullets into 4 bullets
        String[] lines = narrative.split("\\n\\s*[-•*]\\s*|\\n\\s*\\d+\\.\\s*");
        var bullets = new ArrayList<ExecutiveSummaryDto.BulletPoint>();
        String[] categories = {"HEADLINE", "CHANGE", "ATTENTION", "RECOMMENDATION"};
        for (int i = 0; i < Math.min(lines.length, 4); i++) {
            String text = lines[i].trim();
            if (!text.isEmpty()) {
                bullets.add(new ExecutiveSummaryDto.BulletPoint(categories[i], text, null));
            }
        }
        // If we got fewer than 4 bullets, fall back to template (better than returning incomplete)
        if (bullets.size() < 4) return null;
        // Extract KPI snapshot from today's data
        var kpi = new ExecutiveSummaryDto.KpiSnapshot(
            today.sales().net(), today.netProfit(), today.sales().count(),
            today.sales().net().compareTo(BigDecimal.ZERO) > 0
                ? today.netProfit().divide(today.sales().net(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO,
            today.inventory().lowStockLines(), cust.totalCustomers(), cust.churnRisk(), cust.repeatRate());
        var alerts = new ExecutiveSummaryDto.AlertSummary(fraud.size(), (int) today.inventory().lowStockLines(), 0);
        return new ExecutiveSummaryDto(bullets, kpi, alerts, "llm");
    }

    // ---- Rule-based template (deterministic fallback) ----

    private ExecutiveSummaryDto buildTemplate(DashboardDto today, DashboardDto yesterday,
                                               AiFeign.CustomerAnalyticsResponse cust,
                                               List<AiFeign.FlaggedTransaction> fraud) {
        BigDecimal revenue = today.sales().net();
        long orders = today.sales().count();
        BigDecimal profit = today.netProfit();

        // Profit margin
        BigDecimal margin = revenue.compareTo(BigDecimal.ZERO) > 0
            ? profit.divide(revenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
            : BigDecimal.ZERO;

        boolean profitable = profit.compareTo(BigDecimal.ZERO) >= 0;

        // Bullet 1: HEADLINE
        String headline = String.format(
            "Revenue of TSh %,.0f with a %.1f%% profit margin. %s",
            revenue, margin,
            profitable ? "Your business is profitable today." : "Your business is running at a loss today.");

        // Bullet 2: CHANGE — delta vs yesterday
        BigDecimal yesterdayRevenue = yesterday.sales().net();
        String change;
        if (yesterdayRevenue.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal delta = revenue.subtract(yesterdayRevenue)
                .divide(yesterdayRevenue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
            if (delta.compareTo(BigDecimal.ZERO) > 0) {
                change = String.format("Revenue is up %.1f%% compared to yesterday, across %d orders.", delta, orders);
            } else {
                change = String.format("Revenue is down %.1f%% compared to yesterday, across %d orders.", delta.abs(), orders);
            }
        } else {
            change = String.format("Recorded %d orders today generating TSh %,.0f in revenue.", orders, revenue);
        }

        // Bullet 3: ATTENTION — aggregate alerts
        List<String> items = new ArrayList<>();
        long lowStock = today.inventory().lowStockLines();
        if (lowStock > 0) items.add(lowStock + " low-stock items need restocking");
        if (cust.churnRisk() > 0.3) items.add(String.format("%.0f%% customer churn risk", cust.churnRisk() * 100));
        if (!fraud.isEmpty()) items.add(fraud.size() + " flagged transaction" + (fraud.size() > 1 ? "s" : ""));

        String attention = items.isEmpty()
            ? "No urgent issues detected. All systems are operating normally."
            : String.join(". ", items) + " require your attention.";

        // Bullet 4: RECOMMENDATION
        String recommendation;
        if (lowStock > 0) {
            recommendation = "Review the " + lowStock + " low-stock item" + (lowStock > 1 ? "s" : "")
                + " and create purchase orders before they run out.";
        } else if (cust.churnRisk() > 0.3) {
            recommendation = "Engage at-risk customers with targeted promotions to reduce churn.";
        } else if (!fraud.isEmpty()) {
            recommendation = "Review " + fraud.size() + " flagged transaction" + (fraud.size() > 1 ? "s" : "")
                + " for potential fraud.";
        } else {
            recommendation = "Review your top-performing products and consider restocking best-sellers.";
        }

        List<ExecutiveSummaryDto.BulletPoint> bullets = List.of(
            new ExecutiveSummaryDto.BulletPoint("HEADLINE", headline, null),
            new ExecutiveSummaryDto.BulletPoint("CHANGE", change, "revenueChart"),
            new ExecutiveSummaryDto.BulletPoint("ATTENTION", attention, "inventory"),
            new ExecutiveSummaryDto.BulletPoint("RECOMMENDATION", recommendation, null)
        );

        ExecutiveSummaryDto.KpiSnapshot kpi = new ExecutiveSummaryDto.KpiSnapshot(
            revenue, profit, orders, margin, lowStock,
            cust.totalCustomers(), cust.churnRisk(), cust.repeatRate()
        );

        ExecutiveSummaryDto.AlertSummary alertSummary = new ExecutiveSummaryDto.AlertSummary(
            fraud.size(), (int) lowStock, 0
        );

        return new ExecutiveSummaryDto(bullets, kpi, alertSummary, "template");
    }

    // ---- Health pings ----

    private boolean pingAi() {
        try { ai.health(); return true; }
        catch (Exception e) { log.warn("ai-service unreachable: {}", e.getMessage()); return false; }
    }
    private boolean pingSales() {
        try { sales.salesStats(null, null, null, null); return true; }
        catch (Exception e) { log.warn("sales-service unreachable: {}", e.getMessage()); return false; }
    }
    private boolean pingInventory() {
        try { inventory.summary(null); return true; }
        catch (Exception e) { log.warn("inventory-service unreachable: {}", e.getMessage()); return false; }
    }
    private boolean pingPayments() {
        try { payments.paymentStats(null, null, null); return true; }
        catch (Exception e) { log.warn("payment-service unreachable: {}", e.getMessage()); return false; }
    }
}
