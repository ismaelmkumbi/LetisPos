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
 * Demand Forecasting using Holt-Winters exponential smoothing
 * with a 4-week simple moving average fallback.
 *
 * Algorithm:
 * 1. Query sales per product per week for the last 12 weeks
 * 2. If >= 12 data points: Holt-Winters (alpha=0.3, beta=0.1, gamma=0.1, season=7)
 *    with 80% confidence intervals
 * 3. If < 12 data points: fall back to 4-week simple moving average
 * 4. Project next 2 weeks
 * 5. Return top 10 products by projected demand
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
    private static final int MIN_DATA_FOR_HW = 12;
    private static final int SEASON_LENGTH = 7;
    private static final double HW_ALPHA = 0.3;
    private static final double HW_BETA = 0.1;
    private static final double HW_GAMMA = 0.1;
    private static final double CI_Z = 1.28; // 80% confidence interval

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

        // Step 4: For each product, apply Holt-Winters or fall back to
        // 4-week moving average
        List<AiAnalyticsDtos.ForecastItem> forecasts = new ArrayList<>();

        for (Map.Entry<UUID, Map<Integer, Integer>> entry : productWeeklyQty.entrySet()) {
            UUID productId = entry.getKey();
            Map<Integer, Integer> weeklyQtys = entry.getValue();

            // Build aligned weekly demand array (oldest to newest)
            List<Integer> rawDemand = new ArrayList<>();
            int dataPoints = 0;
            for (WeekKey wkKey : last12Weeks) {
                Integer qty = weeklyQtys.getOrDefault(wkKey.week, 0);
                rawDemand.add(qty);
                if (qty > 0) dataPoints++;
            }

            // If less than 2 weeks of data, skip (not enough for meaningful forecast)
            if (dataPoints < 2) continue;

            int projectedDemand;
            int confidence;
            String trend;

            if (dataPoints >= MIN_DATA_FOR_HW) {
                // ---- Holt-Winters path ----
                HoltWintersResult hw = holtWinters(rawDemand, SEASON_LENGTH);

                // Forecast next 2 weeks
                double forecastWk1 = hw.level + 1.0 * hw.trend
                        + hw.seasonal[(rawDemand.size()) % SEASON_LENGTH];
                double forecastWk2 = hw.level + 2.0 * hw.trend
                        + hw.seasonal[(rawDemand.size() + 1) % SEASON_LENGTH];
                projectedDemand = (int) Math.round(Math.max(0, forecastWk1 + forecastWk2));

                // 80% confidence: CI half-width = z * sqrt(MSE), mapped to 0-100
                double ciHalf = CI_Z * Math.sqrt(hw.mse);
                // Express confidence as how tight the interval is relative to forecast
                double forecastAvg = (forecastWk1 + forecastWk2) / 2.0;
                if (forecastAvg > 0 && ciHalf > 0) {
                    double precision = Math.max(0, 1.0 - ciHalf / forecastAvg);
                    confidence = (int) Math.round(precision * 100);
                } else {
                    confidence = 80;
                }
                confidence = Math.min(100, Math.max(0, confidence));

                // Trend from Holt-Winters trend component
                if (hw.trend > 0.5) {
                    trend = "UP";
                } else if (hw.trend < -0.5) {
                    trend = "DOWN";
                } else {
                    trend = "STABLE";
                }
            } else {
                // ---- Moving-average fallback ----
                double movingAvg = 0;
                int count = 0;
                int startIdx = Math.max(0, rawDemand.size() - MOVING_AVG_WINDOW);
                for (int i = startIdx; i < rawDemand.size(); i++) {
                    movingAvg += rawDemand.get(i);
                    count++;
                }
                if (count > 0) movingAvg /= count;
                projectedDemand = (int) Math.round(movingAvg * PROJECTION_WEEKS);

                confidence = (int) Math.round((dataPoints / (double) HISTORY_WEEKS) * 100);
                confidence = Math.min(100, Math.max(0, confidence));

                int mid = rawDemand.size() / 2;
                double firstHalfAvg = avgOf(rawDemand.subList(0, mid));
                double secondHalfAvg = avgOf(rawDemand.subList(mid, rawDemand.size()));
                if (secondHalfAvg > firstHalfAvg * 1.05) {
                    trend = "UP";
                } else if (secondHalfAvg < firstHalfAvg * 0.95) {
                    trend = "DOWN";
                } else {
                    trend = "STABLE";
                }
            }

            forecasts.add(new AiAnalyticsDtos.ForecastItem(
                    productId,
                    productNames.getOrDefault(productId, "Unknown"),
                    productCodes.getOrDefault(productId, ""),
                    BigDecimal.ZERO,
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
                        dateFrom, dateTo, null, null, "CONFIRMED", null, page, PAGE_SIZE);
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

    private record HoltWintersResult(double level, double trend, double[] seasonal, double mse) {}

    /**
     * Holt-Winters additive exponential smoothing (no dampening).
     *
     * @param demand       ordered demand values (oldest → newest), one per period
     * @param seasonLength number of periods in one seasonal cycle (e.g. 7 for weekly)
     * @return fitted level, trend, seasonal indices, and in-sample MSE
     */
    private HoltWintersResult holtWinters(List<Integer> demand, int seasonLength) {
        double alpha = HW_ALPHA, beta = HW_BETA, gamma = HW_GAMMA;
        int n = demand.size();
        double[] level = new double[n];
        double[] trend = new double[n];
        double[] seasonal = new double[seasonLength];

        // Initialize level from average of first season's values
        double firstSeasonAvg = 0;
        int initLen = Math.min(seasonLength, n);
        for (int i = 0; i < initLen; i++) firstSeasonAvg += demand.get(i);
        firstSeasonAvg /= initLen;
        level[seasonLength - 1] = firstSeasonAvg;

        // Initialize trend from first two seasons difference
        trend[seasonLength - 1] = (demand.get(Math.min(seasonLength - 1, n - 1)) - demand.get(0))
                / (double) seasonLength;

        // Initialize seasonal indices as deviations from the level
        for (int i = 0; i < seasonLength && i < n; i++) {
            seasonal[i] = demand.get(i) - firstSeasonAvg;
        }

        // Fit
        double sse = 0;
        for (int t = seasonLength; t < n; t++) {
            double forecast = level[t - 1] + trend[t - 1] + seasonal[t % seasonLength];
            double error = demand.get(t) - forecast;
            sse += error * error;
            level[t] = alpha * (demand.get(t) - seasonal[t % seasonLength])
                    + (1 - alpha) * (level[t - 1] + trend[t - 1]);
            trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1];
            seasonal[t % seasonLength] = gamma * (demand.get(t) - level[t])
                    + (1 - gamma) * seasonal[t % seasonLength];
        }

        double mse = n > seasonLength ? sse / (n - seasonLength) : 0;
        return new HoltWintersResult(level[n - 1], trend[n - 1], seasonal, mse);
    }
}
