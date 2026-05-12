package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AiAnalyticsDtos;
import io.smartpos.ai.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.*;

/**
 * Demand Forecasting using simple moving average.
 *
 * Algorithm:
 * 1. Query sales per product per week for the last 12 weeks
 * 2. Compute 4-week moving average
 * 3. Project next 2 weeks demand = moving average * 2
 * 4. Return top 10 products by projected demand
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastingService {

    private final SalesFeign salesFeign;

    private static final int HISTORY_WEEKS = 12;
    private static final int MOVING_AVG_WINDOW = 4;
    private static final int PROJECTION_WEEKS = 2;
    private static final int MAX_PAGES = 20;
    private static final int PAGE_SIZE = 1000;

    public List<AiAnalyticsDtos.ForecastItem> generateForecast(UUID tenantId) {
        log.info("Generating demand forecast for tenant={}", tenantId);

        // Step 1: Pull sales data for last 90 days (12 weeks + buffer)
        LocalDate dateTo = LocalDate.now();
        LocalDate dateFrom = dateTo.minusDays(90);
        List<SalesFeign.SaleSummary> allSales = fetchSales(dateFrom, dateTo);

        if (allSales.isEmpty()) {
            log.info("No sales data found for tenant={}, returning empty forecast", tenantId);
            return List.of();
        }

        // Step 2: Group sales lines by product and week number
        WeekFields weekFields = WeekFields.of(DayOfWeek.MONDAY, 1);
        Map<UUID, Map<Integer, Integer>> productWeeklyQty = new LinkedHashMap<>();
        Map<UUID, String> productNames = new HashMap<>();
        Map<UUID, String> productCodes = new HashMap<>();

        for (SalesFeign.SaleSummary sale : allSales) {
            if (sale.lines() == null) continue;
            int weekOfYear = sale.date().get(weekFields.weekOfYear());
            for (SalesFeign.SaleLineSummary line : sale.lines()) {
                UUID productId = line.productId();
                productNames.putIfAbsent(productId, line.productName());
                productCodes.putIfAbsent(productId, line.productCode() != null ? line.productCode() : "");
                productWeeklyQty
                    .computeIfAbsent(productId, k -> new LinkedHashMap<>())
                    .merge(weekOfYear, line.qty().intValue(), Integer::sum);
            }
        }

        // Step 3: Align to last 12 ISO weeks
        int currentWeek = dateTo.get(weekFields.weekOfYear());
        int currentYear = dateTo.getYear();

        // Build list of last 12 (year, week) pairs
        List<WeekKey> last12Weeks = new ArrayList<>();
        int yr = currentYear;
        int wk = currentWeek;
        for (int i = 0; i < HISTORY_WEEKS; i++) {
            last12Weeks.add(0, new WeekKey(yr, wk)); // prepend oldest first
            wk--;
            if (wk <= 0) {
                yr--;
                wk = 52; // approximation
            }
        }

        // Step 4: For each product, compute 4-week moving average and project
        List<AiAnalyticsDtos.ForecastItem> forecasts = new ArrayList<>();

        for (Map.Entry<UUID, Map<Integer, Integer>> entry : productWeeklyQty.entrySet()) {
            UUID productId = entry.getKey();
            Map<Integer, Integer> weeklyQtys = entry.getValue();

            // Build aligned weekly demand array (oldest to newest)
            List<Integer> demandHistory = new ArrayList<>();
            int dataPoints = 0;

            // We need to also track year, but for simplicity we use week number only
            // with a sliding reference — fill in qtys for the last 12 weeks
            // Since we grouped by weekOfYear (not year+week), we approximate
            // by building a 12-element array from the data we have
            List<Integer> rawDemand = new ArrayList<>();
            for (WeekKey wkKey : last12Weeks) {
                // Look up demand by week number (approximation — year boundary overlap is rare)
                Integer qty = weeklyQtys.getOrDefault(wkKey.week, 0);
                rawDemand.add(qty);
                if (qty > 0) dataPoints++;
            }

            // If less than 2 weeks of data, skip (not enough for meaningful forecast)
            if (dataPoints < 2) continue;

            // Compute 4-week moving average on the last MOVING_AVG_WINDOW weeks
            double movingAvg = 0;
            int count = 0;
            int startIdx = Math.max(0, rawDemand.size() - MOVING_AVG_WINDOW);
            for (int i = startIdx; i < rawDemand.size(); i++) {
                movingAvg += rawDemand.get(i);
                count++;
            }
            if (count > 0) {
                movingAvg /= count;
            }

            // Project next 2 weeks
            int projectedDemand = (int) Math.round(movingAvg * PROJECTION_WEEKS);

            // Confidence: based on data completeness (weeks with data / total weeks), 0-100
            int confidence = (int) Math.round((dataPoints / (double) HISTORY_WEEKS) * 100);
            confidence = Math.min(100, Math.max(0, confidence));

            // Trend: compare first half average vs second half average
            int mid = rawDemand.size() / 2;
            double firstHalfAvg = avgOf(rawDemand.subList(0, mid));
            double secondHalfAvg = avgOf(rawDemand.subList(mid, rawDemand.size()));
            String trend;
            if (secondHalfAvg > firstHalfAvg * 1.05) {
                trend = "UP";
            } else if (secondHalfAvg < firstHalfAvg * 0.95) {
                trend = "DOWN";
            } else {
                trend = "STABLE";
            }

            forecasts.add(new AiAnalyticsDtos.ForecastItem(
                    productId,
                    productNames.getOrDefault(productId, "Unknown"),
                    productCodes.getOrDefault(productId, ""),
                    BigDecimal.ZERO, // currentStock — filled later if stock data available
                    projectedDemand,
                    confidence,
                    trend,
                    dataPoints,
                    rawDemand
            ));
        }

        // Sort by projected demand desc, limit to 10
        forecasts.sort((a, b) -> Integer.compare(b.projectedDemand(), a.projectedDemand()));
        List<AiAnalyticsDtos.ForecastItem> top10 = forecasts.size() > 10
                ? forecasts.subList(0, 10)
                : forecasts;

        log.info("Generated forecast with {} entries for tenant={}", top10.size(), tenantId);
        return top10;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<SalesFeign.SaleSummary> fetchSales(LocalDate dateFrom, LocalDate dateTo) {
        List<SalesFeign.SaleSummary> all = new ArrayList<>();
        for (int page = 0; page < MAX_PAGES; page++) {
            try {
                SalesFeign.SalePage result = salesFeign.search(
                        dateFrom, dateTo, null, null, "CONFIRMED", page, PAGE_SIZE);
                if (result == null || result.content() == null || result.content().isEmpty()) break;
                all.addAll(result.content());
                if (page + 1 >= result.totalPages()) break;
            } catch (Exception e) {
                log.warn("Failed to fetch sales page {}: {}", page, e.getMessage());
                break;
            }
        }
        return all;
    }

    private static double avgOf(List<Integer> values) {
        if (values == null || values.isEmpty()) return 0;
        return values.stream().mapToInt(Integer::intValue).average().orElse(0);
    }

    private record WeekKey(int year, int week) {}
}
