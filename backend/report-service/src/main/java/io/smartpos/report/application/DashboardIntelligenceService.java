package io.smartpos.report.application;

import io.smartpos.report.api.dto.*;
import io.smartpos.report.api.dto.UnifiedResponse.*;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.*;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import org.springframework.beans.factory.annotation.Value;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

/**
 * Serves AI-enhanced dashboard intelligence endpoints (trends, executive
 * summary, demand forecasting, reorder recommendations, profit opportunities,
 * retention alerts and cash flow projections) with per-cache TTLs.
 *
 * Phase 6g: {@code @PostConstruct warmCaches()} pre-warms the intelligence
 * cache on startup so the first render is instant.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardIntelligenceService {

    public static final String CACHE_DASHBOARD_INTELLIGENCE    = "dashboard-intelligence";
    public static final String CACHE_DASHBOARD_TRENDS          = "dashboard-trends";
    public static final String CACHE_DASHBOARD_EXECUTIVE_SUMMARY = "dashboard-executive-summary";

    private final SalesFeign sales;
    private final InventoryFeign inventory;
    private final PaymentFeign payments;
    private final AiFeign ai;
    private final DataFreshnessService freshness;
    private final DashboardService dashboardService;
    private final ProductFeign productFeign;

    @Value("${smartpos.report.default-currency:TZS}")
    private String defaultCurrency;

    @Lazy
    @Autowired
    private DashboardIntelligenceService self;

    // ── 1. Status ────────────────────────────────────────────────────────────

    /**
     * Returns the intelligence-system status for the current tenant:
     * reachability of each downstream service plus data freshness metadata.
     * Cache TTL is short (5 min) because this is the "heartbeat" of the
     * intelligence layer.
     */
    @Cacheable(value = CACHE_DASHBOARD_INTELLIGENCE,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('status')",
               unless = "#result == null")
    public UnifiedResponse<DashboardIntelligenceDto> status() {
        TenantContext.require();
        log.debug("Computing dashboard intelligence status");

        boolean aiOk        = ping(() -> ai.customerAnalytics());
        boolean salesOk     = ping(() -> sales.salesStats(null, null, null, null));
        boolean inventoryOk = ping(() -> inventory.summary(null));
        boolean paymentOk   = ping(() -> payments.paymentStats(null, null, null));

        DataFreshnessMap fm = freshness.currentFreshness();
        List<Alert> alerts = freshness.buildAlerts(fm);

        DashboardIntelligenceDto dto = new DashboardIntelligenceDto(
                "dashboard-intelligence",
                "2.0",
                Instant.now(),
                aiOk, salesOk, inventoryOk, paymentOk
        );

        String status = alerts.isEmpty() ? "ok" : "degraded";
        ResponseMeta meta = new ResponseMeta(Instant.now(), fm, alerts);
        return new UnifiedResponse<>(status, dto, meta);
    }

    // ── 2. Cache warm ────────────────────────────────────────────────────────

    /**
     * Pre-warms the intelligence cache after the application is fully ready.
     * Uses {@code ApplicationReadyEvent} instead of {@code @PostConstruct} so the
     * lazy self-proxy is available.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void warmCaches() {
        log.info("Warming dashboard intelligence caches...");
        try {
            // Trigger the status check to warm the intelligence cache
            self.status();
            log.info("Dashboard intelligence caches warmed successfully");
        } catch (Exception e) {
            log.warn("Cache warming completed with warnings: {}", e.getMessage());
        }
    }

    // ── 3. Executive summary (cached) ────────────────────────────────────────

    /**
     * AI-generated executive summary with rule-based template fallback.
     * Cached for 1 hour per tenant per date.
     */
    @Cacheable(value = CACHE_DASHBOARD_EXECUTIVE_SUMMARY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('exec-summary', #date)",
               unless = "#result == null")
    public UnifiedResponse<ExecutiveSummaryDto> executiveSummary(@Nullable LocalDate date) {
        return doExecutiveSummary(date);
    }

    // ── 4. Executive summary (uncached) ──────────────────────────────────────

    /**
     * Same as {@link #executiveSummary(LocalDate)} but bypasses the cache.
     * Used when the caller passes {@code ?refresh=true}.
     */
    public UnifiedResponse<ExecutiveSummaryDto> executiveSummaryUncached(@Nullable LocalDate date) {
        return doExecutiveSummary(date);
    }

    private UnifiedResponse<ExecutiveSummaryDto> doExecutiveSummary(@Nullable LocalDate date) {
        TenantContext.require();
        LocalDate today = date != null ? date : LocalDate.now();

        DashboardDto todayDto = safeDashboard(null, Period.TODAY);
        DashboardDto yesterdayDto = safeDashboard(null, Period.YESTERDAY);
        AiFeign.CustomerAnalyticsResponse cust = safeCustomerAnalytics();
        List<AiFeign.FlaggedTransaction> fraud = safeFraudAlerts();

        // Try LLM narration with 3 s timeout; fall back to template
        String provider;
        List<ExecutiveSummaryDto.BulletPoint> bullets;
        try {
            String narrative = tryLlm(todayDto, yesterdayDto, cust, fraud);
            bullets = List.of(new ExecutiveSummaryDto.BulletPoint(
                    "HEADLINE", narrative, "kpiGrid"));
            provider = "llm";
        } catch (Exception e) {
            log.warn("LLM narration failed, falling back to template: {}", e.getMessage());
            bullets = buildTemplate(todayDto, yesterdayDto, cust, fraud);
            provider = "template";
        }

        ExecutiveSummaryDto.KpiSnapshot kpi = buildKpiSnapshot(todayDto, cust);
        ExecutiveSummaryDto.AlertSummary alertSummary = buildAlertSummary(fraud, todayDto);

        ExecutiveSummaryDto data = new ExecutiveSummaryDto(bullets, kpi, alertSummary, provider);
        ResponseMeta meta = buildMeta();
        return UnifiedResponse.ok(data, meta);
    }

    // ── 5. Demand forecast ───────────────────────────────────────────────────

    @Cacheable(value = CACHE_DASHBOARD_TRENDS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('demand', #warehouseId, #horizonDays)",
               unless = "#result == null")
    public UnifiedResponse<DemandForecastDto> demandForecast(@Nullable UUID warehouseId, int horizonDays) {
        TenantContext.require();

        List<AiFeign.ForecastItem> items = safeForecast();
        List<DemandForecastDto.ForecastEntry> entries = items.stream()
                .sorted(Comparator.comparingInt(AiFeign.ForecastItem::projectedDemand).reversed())
                .limit(10)
                .map(f -> new DemandForecastDto.ForecastEntry(
                        f.productId(), f.productName(), f.projectedDemand(),
                        f.confidence(), f.trend(), f.weeksOfData()))
                .toList();

        LocalDate today = LocalDate.now();
        DemandForecastDto data = new DemandForecastDto(
                entries, 0L,
                today.toString(),
                today.plusDays(horizonDays).toString()
        );

        ResponseMeta meta = buildMeta();
        return UnifiedResponse.ok(data, meta);
    }

    // ── 6. Reorder recommendations ───────────────────────────────────────────

    @Cacheable(value = CACHE_DASHBOARD_INTELLIGENCE,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('reorder', #warehouseId)",
               unless = "#result == null")
    public UnifiedResponse<ReorderRecommendationDto> reorderRecommendations(@Nullable UUID warehouseId) {
        TenantContext.require();

        List<InventoryFeign.ReorderSuggestion> suggestions = safeReorderSuggestions();
        List<ReorderRecommendationDto.ReorderEntry> entries = suggestions.stream()
                .sorted(Comparator.comparingInt(this::urgencyRank))
                .map(s -> new ReorderRecommendationDto.ReorderEntry(
                        s.productId(), s.productName(), s.currentStock(),
                        s.minQty(), s.suggestedQty(), s.dailyVelocity(),
                        s.urgency(),
                        s.expectedShortageDate() != null ? s.expectedShortageDate().toString() : null))
                .toList();

        ReorderRecommendationDto data = new ReorderRecommendationDto(entries);
        ResponseMeta meta = buildMeta();
        return UnifiedResponse.ok(data, meta);
    }

    private int urgencyRank(InventoryFeign.ReorderSuggestion s) {
        if (s.urgency() == null) return 99;
        return switch (s.urgency().toUpperCase()) {
            case "CRITICAL" -> 0;
            case "HIGH"     -> 1;
            case "MEDIUM"   -> 2;
            default         -> 3;
        };
    }

    // ── 7. Profit opportunities ──────────────────────────────────────────────

    @Cacheable(value = CACHE_DASHBOARD_EXECUTIVE_SUMMARY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('profit-opps', #warehouseId)",
               unless = "#result == null")
    public UnifiedResponse<ProfitOpportunityDto> profitOpportunities(@Nullable UUID warehouseId) {
        TenantContext.require();

        List<ProductFeign.ProductInfo> products = safeProductList(0, 500);
        List<ProfitOpportunityDto.OpportunityEntry> candidates = new ArrayList<>();

        for (ProductFeign.ProductInfo p : products) {
            BigDecimal cost = nz(p.cost());
            BigDecimal price = nz(p.price());
            if (price.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal margin = price.subtract(cost)
                    .divide(price, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            if (margin.compareTo(BigDecimal.valueOf(15)) < 0) {
                // Rough monthly impact: assume 30 units/month at this deficient margin
                BigDecimal gapFromTarget = BigDecimal.valueOf(15).subtract(margin);
                BigDecimal estimatedMonthlyImpact = price.multiply(BigDecimal.valueOf(30))
                        .multiply(gapFromTarget)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

                candidates.add(new ProfitOpportunityDto.OpportunityEntry(
                        p.id(), p.name(), p.category() != null ? p.category() : "Uncategorized",
                        margin, 0,
                        estimatedMonthlyImpact,
                        "Margin " + margin.setScale(1, RoundingMode.HALF_UP) + "% is below 15% threshold"
                ));
            }
        }

        candidates.sort(Comparator.comparing(ProfitOpportunityDto.OpportunityEntry::currentMargin));
        List<ProfitOpportunityDto.OpportunityEntry> top5 = candidates.size() > 5
                ? new ArrayList<>(candidates.subList(0, 5)) : candidates;

        BigDecimal totalImpact = top5.stream()
                .map(ProfitOpportunityDto.OpportunityEntry::estimatedMonthlyImpact)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ProfitOpportunityDto data = new ProfitOpportunityDto(top5, totalImpact);
        ResponseMeta meta = buildMeta();
        return UnifiedResponse.ok(data, meta);
    }

    // ── 8. Retention alerts ──────────────────────────────────────────────────

    @Cacheable(value = CACHE_DASHBOARD_EXECUTIVE_SUMMARY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('retention')",
               unless = "#result == null")
    public UnifiedResponse<CustomerRetentionDto> retentionAlerts() {
        TenantContext.require();

        AiFeign.CustomerAnalyticsResponse cust = safeCustomerAnalytics();
        LocalDate now = LocalDate.now();

        List<CustomerRetentionDto.AtRiskCustomer> atRisk = cust.topCustomers().stream()
                .filter(c -> "At Risk".equalsIgnoreCase(c.segment()) || "Lost".equalsIgnoreCase(c.segment()))
                .sorted(Comparator.comparing(AiFeign.TopCustomer::totalSpent).reversed())
                .limit(5)
                .map(c -> {
                    long lastVisitDays = c.lastPurchase() != null
                            ? ChronoUnit.DAYS.between(c.lastPurchase(), now)
                            : 365;
                    return new CustomerRetentionDto.AtRiskCustomer(
                            c.id(), c.name(), lastVisitDays,
                            c.totalSpent() != null ? c.totalSpent().longValue() : 0L,
                            c.segment(), c.visits());
                })
                .toList();

        long totalAtRiskRevenue = atRisk.stream()
                .mapToLong(CustomerRetentionDto.AtRiskCustomer::lifetimeValue)
                .sum();

        CustomerRetentionDto data = new CustomerRetentionDto(
                atRisk, totalAtRiskRevenue, cust.totalCustomers(), cust.churnRisk());

        ResponseMeta meta = buildMeta();
        return UnifiedResponse.ok(data, meta);
    }

    // ── 9. Cash flow forecast ────────────────────────────────────────────────

    @Cacheable(value = CACHE_DASHBOARD_EXECUTIVE_SUMMARY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('cashflow', #days)",
               unless = "#result == null")
    public UnifiedResponse<CashFlowForecastDto> cashFlowForecast(int days) {
        TenantContext.require();

        LocalDate today = LocalDate.now();
        PaymentFeign.PaymentStats payStats = safePaymentStats();
        SalesFeign.SaleStats saleStats = safeSalesStatsAll();
        PaymentFeign.ExpenseStats expStats = safeExpenseStatsAll();
        List<PaymentFeign.AgingBucket> aging = safeAging();

        // Opening balance = rough estimate from net payment position
        long openingBalance = nz(payStats.totalIn()).subtract(nz(payStats.totalOut())).longValue();

        // Average daily inflow from sales net over 30 days
        long dailyInflow = saleStats.count() > 0
                ? nz(saleStats.net()).divide(BigDecimal.valueOf(Math.max(1, saleStats.count())), 0, RoundingMode.HALF_UP).longValue()
                : 0L;

        // If saleStats.count() is a count of sales (transactions), not days,
        // we should really compute per-day differently. Use 30-day window:
        long daysInPeriod = 30L;
        dailyInflow = nz(saleStats.net()).divide(BigDecimal.valueOf(daysInPeriod), 0, RoundingMode.HALF_UP).longValue();

        // Average daily outflow from expenses + AP aging spread
        long dailyExpense = expStats.count() > 0
                ? nz(expStats.total()).divide(BigDecimal.valueOf(daysInPeriod), 0, RoundingMode.HALF_UP).longValue()
                : 0L;

        long agingDaily = 0L;
        if (!aging.isEmpty()) {
            BigDecimal totalAging = aging.stream()
                    .map(PaymentFeign.AgingBucket::amount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long agingDays = aging.stream()
                    .mapToInt(a -> Math.max(1, a.daysTo() - a.daysFrom()))
                    .sum();
            agingDaily = totalAging.divide(BigDecimal.valueOf(Math.max(1, agingDays)), 0, RoundingMode.HALF_UP).longValue();
        }

        long dailyOutflow = dailyExpense + agingDaily;
        long safetyThreshold = dailyOutflow * 7;

        long currentBalance = openingBalance;
        long lowestBalance = currentBalance;
        String lowestBalanceDate = today.toString();

        List<CashFlowForecastDto.DailyProjection> projections = new ArrayList<>();
        LocalDate cursor = today;

        for (int i = 0; i < days; i++) {
            cursor = cursor.plusDays(1);
            long prevBalance = currentBalance;
            long dayInflows = dailyInflow;
            long dayOutflows = dailyOutflow;
            long closingBalance = prevBalance + dayInflows - dayOutflows;
            boolean isDangerDay = closingBalance < safetyThreshold;

            projections.add(new CashFlowForecastDto.DailyProjection(
                    cursor.toString(), prevBalance, dayInflows,
                    dayOutflows, closingBalance, isDangerDay));

            currentBalance = closingBalance;
            if (closingBalance < lowestBalance) {
                lowestBalance = closingBalance;
                lowestBalanceDate = cursor.toString();
            }
        }

        CashFlowForecastDto data = new CashFlowForecastDto(
                projections, openingBalance, lowestBalance, lowestBalanceDate, safetyThreshold);

        ResponseMeta meta = buildMeta();
        return UnifiedResponse.ok(data, meta);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════════════════

    // ── Ping helper ──────────────────────────────────────────────────────────

    private boolean ping(Runnable action) {
        try {
            action.run();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ── Response metadata ────────────────────────────────────────────────────

    private ResponseMeta buildMeta() {
        DataFreshnessMap fm = freshness.currentFreshness();
        List<Alert> alerts = freshness.buildAlerts(fm);
        return new ResponseMeta(Instant.now(), fm, alerts);
    }

    // ── KPI snapshot builder ─────────────────────────────────────────────────

    private ExecutiveSummaryDto.KpiSnapshot buildKpiSnapshot(
            DashboardDto today, AiFeign.CustomerAnalyticsResponse cust) {

        BigDecimal revenue = today.sales() != null ? nz(today.sales().net()) : BigDecimal.ZERO;
        BigDecimal netProfit = nz(today.netProfit());

        BigDecimal margin = BigDecimal.ZERO;
        if (revenue.compareTo(BigDecimal.ZERO) > 0) {
            margin = netProfit.divide(revenue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        long orderCount = today.sales() != null ? today.sales().count() : 0L;
        long lowStockLines = today.inventory() != null ? today.inventory().lowStockLines() : 0L;
        long totalCustomers = cust != null ? cust.totalCustomers() : 0L;
        double churnRisk = cust != null ? cust.churnRisk() : 0.0;
        double repeatRate = cust != null ? cust.repeatRate() : 0.0;

        return new ExecutiveSummaryDto.KpiSnapshot(
                revenue, netProfit, orderCount, margin,
                lowStockLines, totalCustomers, churnRisk, repeatRate);
    }

    // ── Alert summary builder ────────────────────────────────────────────────

    private ExecutiveSummaryDto.AlertSummary buildAlertSummary(
            List<AiFeign.FlaggedTransaction> fraud, DashboardDto today) {

        int fraudAlerts = fraud != null ? fraud.size() : 0;
        int stockAlerts = today.inventory() != null ? (int) today.inventory().lowStockLines() : 0;
        int paymentAlerts = 0;
        if (today.sales() != null && today.sales().due().compareTo(BigDecimal.ZERO) > 0) {
            paymentAlerts = 1;
        }
        return new ExecutiveSummaryDto.AlertSummary(fraudAlerts, stockAlerts, paymentAlerts);
    }

    // ── Template fallback (4 bullets) ────────────────────────────────────────

    /**
     * Produces 4 executive-summary bullets when the LLM is unavailable:
     * HEADLINE, CHANGE, ATTENTION, RECOMMENDATION.
     */
    private List<ExecutiveSummaryDto.BulletPoint> buildTemplate(
            DashboardDto today, DashboardDto yesterday,
            AiFeign.CustomerAnalyticsResponse cust,
            List<AiFeign.FlaggedTransaction> fraud) {

        List<ExecutiveSummaryDto.BulletPoint> bullets = new ArrayList<>();

        // HEADLINE — today's revenue and profit snapshot
        BigDecimal revenue = today.sales() != null ? nz(today.sales().net()) : BigDecimal.ZERO;
        String headline = String.format("Today's revenue: %s with net profit %s",
                formatCurrency(revenue), formatCurrency(nz(today.netProfit())));
        bullets.add(new ExecutiveSummaryDto.BulletPoint("HEADLINE", headline, "kpiGrid"));

        // CHANGE — comparison vs yesterday
        if (yesterday != null && yesterday.sales() != null) {
            BigDecimal yesterdayRevenue = nz(yesterday.sales().net());
            if (revenue.compareTo(BigDecimal.ZERO) > 0 && yesterdayRevenue.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal change = revenue.subtract(yesterdayRevenue)
                        .divide(yesterdayRevenue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
                String direction = change.compareTo(BigDecimal.ZERO) >= 0 ? "up" : "down";
                String changeText = String.format("Revenue %s %s%% vs yesterday",
                        direction, change.abs().setScale(1, RoundingMode.HALF_UP));
                bullets.add(new ExecutiveSummaryDto.BulletPoint("CHANGE", changeText, "revenueChart"));
            } else {
                bullets.add(new ExecutiveSummaryDto.BulletPoint("CHANGE",
                        "Revenue is comparable to yesterday", "revenueChart"));
            }
        } else {
            bullets.add(new ExecutiveSummaryDto.BulletPoint("CHANGE",
                    "No yesterday data for comparison", "revenueChart"));
        }

        // ATTENTION — flag issues: fraud, low stock, churn
        List<String> attentionItems = new ArrayList<>();
        if (fraud != null && !fraud.isEmpty()) {
            attentionItems.add(fraud.size() + " fraud alert(s) detected");
        }
        if (today.inventory() != null && today.inventory().lowStockLines() > 0) {
            attentionItems.add(today.inventory().lowStockLines() + " product(s) low on stock");
        }
        if (cust != null && cust.churnRisk() > 50) {
            attentionItems.add("Customer churn risk at " + String.format("%.0f%%", cust.churnRisk()));
        }
        if (!attentionItems.isEmpty()) {
            bullets.add(new ExecutiveSummaryDto.BulletPoint("ATTENTION",
                    String.join("; ", attentionItems), "inventory"));
        } else {
            bullets.add(new ExecutiveSummaryDto.BulletPoint("ATTENTION",
                    "No critical alerts at this time", "inventory"));
        }

        // RECOMMENDATION — action items
        List<String> recommendations = new ArrayList<>();
        if (today.inventory() != null && today.inventory().lowStockLines() > 0) {
            recommendations.add("Review low-stock items and create purchase orders");
        }
        if (cust != null && cust.churnRisk() > 30) {
            recommendations.add("Launch customer retention campaign for at-risk segments");
        }
        if (fraud != null && !fraud.isEmpty()) {
            recommendations.add("Review flagged transactions in fraud detection dashboard");
        }
        if (!recommendations.isEmpty()) {
            bullets.add(new ExecutiveSummaryDto.BulletPoint("RECOMMENDATION",
                    String.join("; ", recommendations), "customers"));
        } else {
            bullets.add(new ExecutiveSummaryDto.BulletPoint("RECOMMENDATION",
                    "Continue monitoring KPIs — no immediate actions required", "kpiGrid"));
        }

        return bullets;
    }

    // ── LLM narrate attempt ──────────────────────────────────────────────────

    /**
     * Calls the AI narrate endpoint asynchronously with a 3-second timeout.
     * Throws if the LLM is unreachable, times out, or returns an empty narrative,
     * so the caller can fall back to the template.
     */
    private String tryLlm(DashboardDto today, DashboardDto yesterday,
                          AiFeign.CustomerAnalyticsResponse cust,
                          List<AiFeign.FlaggedTransaction> fraud)
            throws InterruptedException, ExecutionException, TimeoutException {

        String factsJson = buildFactsJson(today, yesterday, cust, fraud);

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("reportKind", "executive-summary");
        request.put("factsJson", factsJson);
        request.put("currency", defaultCurrency);

        CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> ai.narrate(request));

        Map<String, Object> response = future.orTimeout(3, TimeUnit.SECONDS).get();

        if (response == null || !response.containsKey("narrative")) {
            throw new RuntimeException("LLM returned empty narrative");
        }
        String narrative = Objects.toString(response.get("narrative"), "");
        if (narrative.isBlank()) {
            throw new RuntimeException("LLM narrative is blank");
        }
        return narrative;
    }

    /**
     * Builds a compact JSON string of dashboard facts to feed into the LLM
     * narrate endpoint.
     */
    private String buildFactsJson(DashboardDto today, DashboardDto yesterday,
                                  AiFeign.CustomerAnalyticsResponse cust,
                                  List<AiFeign.FlaggedTransaction> fraud) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"currency\":\"").append(defaultCurrency).append("\",");
        sb.append("\"date\":\"").append(today.from()).append("\",");
        sb.append("\"revenue\":").append(nz(today.sales() != null ? today.sales().net() : null)).append(",");
        sb.append("\"netProfit\":").append(nz(today.netProfit())).append(",");
        sb.append("\"orderCount\":").append(today.sales() != null ? today.sales().count() : 0).append(",");
        sb.append("\"lowStockLines\":").append(today.inventory() != null ? today.inventory().lowStockLines() : 0).append(",");
        sb.append("\"fraudAlerts\":").append(fraud != null ? fraud.size() : 0).append(",");
        if (cust != null) {
            sb.append("\"totalCustomers\":").append(cust.totalCustomers()).append(",");
            sb.append("\"churnRisk\":").append(cust.churnRisk()).append(",");
            sb.append("\"repeatRate\":").append(cust.repeatRate()).append(",");
        }
        if (yesterday != null && yesterday.sales() != null) {
            sb.append("\"yesterdayRevenue\":").append(nz(yesterday.sales().net())).append(",");
        }
        sb.append("\"provider\":\"template\"}");
        return sb.toString();
    }

    // ── Safe downstream wrappers ─────────────────────────────────────────────

    private DashboardDto safeDashboard(UUID warehouseId, Period period) {
        try {
            return dashboardService.dashboard(warehouseId, period);
        } catch (Exception e) {
            log.warn("dashboardService.dashboard({}, {}) failed: {}", warehouseId, period, e.getMessage());
            return zeroDashboard();
        }
    }

    private AiFeign.CustomerAnalyticsResponse safeCustomerAnalytics() {
        try {
            return ai.customerAnalytics();
        } catch (Exception e) {
            log.warn("ai.customerAnalytics() failed: {}", e.getMessage());
            return zeroCustomerAnalytics();
        }
    }

    private List<AiFeign.FlaggedTransaction> safeFraudAlerts() {
        try {
            return ai.fraudDetection();
        } catch (Exception e) {
            log.warn("ai.fraudDetection() failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<AiFeign.ForecastItem> safeForecast() {
        try {
            return ai.forecasting();
        } catch (Exception e) {
            log.warn("ai.forecasting() failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<InventoryFeign.ReorderSuggestion> safeReorderSuggestions() {
        try {
            return inventory.reorderSuggestions();
        } catch (Exception e) {
            log.warn("inventory.reorderSuggestions() failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<ProductFeign.ProductInfo> safeProductList(int page, int size) {
        try {
            return productFeign.listProducts(page, size);
        } catch (Exception e) {
            log.warn("productFeign.listProducts({}, {}) failed: {}", page, size, e.getMessage());
            return Collections.emptyList();
        }
    }

    private PaymentFeign.PaymentStats safePaymentStats() {
        try {
            return payments.paymentStats(LocalDate.now().minusDays(30), LocalDate.now(), null);
        } catch (Exception e) {
            log.warn("payments.paymentStats() failed: {}", e.getMessage());
            return new PaymentFeign.PaymentStats(0, BigDecimal.ZERO, BigDecimal.ZERO);
        }
    }

    private SalesFeign.SaleStats safeSalesStatsAll() {
        try {
            return sales.salesStats(LocalDate.now().minusDays(30), LocalDate.now(), null, null);
        } catch (Exception e) {
            log.warn("sales.salesStats() failed: {}", e.getMessage());
            return emptySaleStats();
        }
    }

    private PaymentFeign.ExpenseStats safeExpenseStatsAll() {
        try {
            return payments.expenseStats(LocalDate.now().minusDays(30), LocalDate.now());
        } catch (Exception e) {
            log.warn("payments.expenseStats() failed: {}", e.getMessage());
            return new PaymentFeign.ExpenseStats(BigDecimal.ZERO, 0);
        }
    }

    private List<PaymentFeign.AgingBucket> safeAging() {
        try {
            return payments.aging(LocalDate.now());
        } catch (Exception e) {
            log.warn("payments.aging() failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Zero-value fallbacks ─────────────────────────────────────────────────

    private DashboardDto zeroDashboard() {
        LocalDate today = LocalDate.now();
        BigDecimal z = BigDecimal.ZERO;
        return new DashboardDto(
                today, today,
                new DashboardDto.Sales(0L, z, z, z, z, z, z),
                new DashboardDto.Purchases(0L, z, z, z),
                new DashboardDto.Payments(0L, z, z),
                new DashboardDto.Expenses(z, 0L),
                new DashboardDto.Inventory(0L, z, z, 0L),
                Collections.emptyList(),
                Collections.emptyList(),
                z,
                z
        );
    }

    private AiFeign.CustomerAnalyticsResponse zeroCustomerAnalytics() {
        return new AiFeign.CustomerAnalyticsResponse(0L, 0.0, BigDecimal.ZERO, 0.0,
                Collections.emptyList(), Collections.emptyList());
    }

    private SalesFeign.SaleStats emptySaleStats() {
        BigDecimal z = BigDecimal.ZERO;
        return new SalesFeign.SaleStats(0L, z, z, z, z, z, z);
    }

    // ── Formatting utilities ─────────────────────────────────────────────────

    private String formatCurrency(BigDecimal value) {
        if (value == null) return currencySymbol() + "0.00";
        return currencySymbol() + " " + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String currencySymbol() {
        return switch (defaultCurrency) {
            case "TZS" -> "TSh";
            case "KES" -> "KSh";
            case "UGX" -> "USh";
            case "USD" -> "$";
            case "EUR" -> "€";
            case "GBP" -> "£";
            default -> defaultCurrency;
        };
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
