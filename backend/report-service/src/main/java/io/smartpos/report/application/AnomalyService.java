package io.smartpos.report.application;

import io.smartpos.report.api.dto.AnomalyDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

/**
 * Detects anomalies by comparing today's metrics against the historical average
 * for the same day-of-week. An anomaly is flagged when the deviation exceeds
 * 2 standard deviations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyService {

    private final SalesFeign  sales;
    private final PaymentFeign payments;

    /**
     * Returns anomaly records for the current day. Only includes metrics where
     * the deviation is significant (>2 standard deviations from the mean).
     */
    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#warehouseId, 'anomalies')",
               unless = "#result == null")
    public List<AnomalyDto> anomalies(UUID warehouseId) {
        TenantContext.require();
        LocalDate today = LocalDate.now();
        DayOfWeek dow = today.getDayOfWeek();

        // Collect historical data for the same day-of-week over past 12 weeks
        List<HistoricalDay> history = new ArrayList<>();
        for (int w = 1; w <= 12; w++) {
            LocalDate histDate = today.minusWeeks(w);
            LocalDate dateFrom = histDate;
            LocalDate dateTo   = histDate;
            try {
                SalesFeign.SaleStats s = sales.salesStats(dateFrom, dateTo, warehouseId, null);
                PaymentFeign.ExpenseStats e = payments.expenseStats(dateFrom, dateTo);
                history.add(new HistoricalDay(
                        nz(s.net()), s.count(), nz(e.total())));
            } catch (Exception ex) {
                log.debug("Skipping historical date {}: {}", histDate, ex.getMessage());
            }
        }

        if (history.size() < 4) {
            return Collections.emptyList(); // not enough data
        }

        // Compute means and std deviations
        double[] salesVals  = history.stream().mapToDouble(h -> h.salesNet.doubleValue()).toArray();
        double[] orderVals  = history.stream().mapToDouble(h -> (double) h.orderCount).toArray();
        double[] expenseVals = history.stream().mapToDouble(h -> h.expenses.doubleValue()).toArray();

        double salesMean  = mean(salesVals);
        double salesStd   = stdDev(salesVals, salesMean);
        double orderMean  = mean(orderVals);
        double orderStd   = stdDev(orderVals, orderMean);
        double expenseMean = mean(expenseVals);
        double expenseStd  = stdDev(expenseVals, expenseMean);

        // Get today's actuals
        BigDecimal todaySalesNet;
        long todayOrderCount;
        BigDecimal todayExpenses;
        try {
            SalesFeign.SaleStats todayStats = sales.salesStats(today, today, warehouseId, null);
            todaySalesNet   = nz(todayStats.net());
            todayOrderCount = todayStats.count();
        } catch (Exception e) {
            log.warn("Could not fetch today's sales stats: {}", e.getMessage());
            return Collections.emptyList();
        }
        try {
            PaymentFeign.ExpenseStats todayExp = payments.expenseStats(today, today);
            todayExpenses = nz(todayExp.total());
        } catch (Exception e) {
            log.warn("Could not fetch today's expense stats: {}", e.getMessage());
            todayExpenses = BigDecimal.ZERO;
        }

        List<AnomalyDto> result = new ArrayList<>();

        // Sales anomaly
        if (salesStd > 0) {
            double dev = (todaySalesNet.doubleValue() - salesMean) / salesStd;
            if (Math.abs(dev) > 2) {
                result.add(new AnomalyDto(
                        "Sales Revenue",
                        todaySalesNet,
                        BigDecimal.valueOf(salesMean).setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(dev).setScale(2, RoundingMode.HALF_UP),
                        Math.abs(dev) > 3 ? "error" : "warning"
                ));
            }
        }

        // Orders anomaly
        if (orderStd > 0) {
            double dev = (todayOrderCount - orderMean) / orderStd;
            if (Math.abs(dev) > 2) {
                result.add(new AnomalyDto(
                        "Order Count",
                        BigDecimal.valueOf(todayOrderCount),
                        BigDecimal.valueOf(orderMean).setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(dev).setScale(2, RoundingMode.HALF_UP),
                        Math.abs(dev) > 3 ? "error" : "warning"
                ));
            }
        }

        // Expenses anomaly
        if (expenseStd > 0) {
            double dev = (todayExpenses.doubleValue() - expenseMean) / expenseStd;
            if (Math.abs(dev) > 2) {
                result.add(new AnomalyDto(
                        "Expenses",
                        todayExpenses,
                        BigDecimal.valueOf(expenseMean).setScale(2, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(dev).setScale(2, RoundingMode.HALF_UP),
                        Math.abs(dev) > 3 ? "error" : "warning"
                ));
            }
        }

        return result;
    }

    private record HistoricalDay(BigDecimal salesNet, long orderCount, BigDecimal expenses) {}

    private static double mean(double[] vals) {
        return Arrays.stream(vals).average().orElse(0);
    }

    private static double stdDev(double[] vals, double mean) {
        double variance = Arrays.stream(vals)
                .map(v -> (v - mean) * (v - mean))
                .average().orElse(0);
        return Math.sqrt(variance);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
