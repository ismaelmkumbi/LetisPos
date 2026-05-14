package io.smartpos.report.application;

import io.smartpos.report.api.dto.ForecastDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Simple linear-regression forecast over daily sales net values.
 * Fits y = a + b*x where x = day index (0-based), then projects N days forward.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#warehouseId, 'forecast-' + #days)",
               unless = "#result == null")
    public ForecastDto forecast(UUID warehouseId, Period period, int days) {
        TenantContext.get().orElse(null);
        LocalDate today = LocalDate.now();
        LocalDate from = period.from(today);
        LocalDate to   = period.to(today);

        List<SalesFeign.SalesSeriesPoint> raw = safeSeries(from, to, warehouseId);
        if (raw.size() < 3) {
            return new ForecastDto(Collections.emptyList(), Collections.emptyList());
        }

        // Build historical points
        List<ForecastDto.ForecastPoint> historical = raw.stream()
                .map(p -> new ForecastDto.ForecastPoint(p.date(), p.net()))
                .toList();

        // Simple linear regression: y = intercept + slope * x
        int n = raw.size();
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (int i = 0; i < n; i++) {
            double x = i;
            double y = raw.get(i).net().doubleValue();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        double intercept = (sumY - slope * sumX) / n;

        // Project next N days
        List<ForecastDto.ForecastPoint> projected = new ArrayList<>();
        for (int d = 1; d <= days; d++) {
            double x = n - 1 + d;
            double projectedValue = intercept + slope * x;
            // Don't project negative values
            if (projectedValue < 0) projectedValue = 0;
            LocalDate projectedDate = to.plusDays(d);
            projected.add(new ForecastDto.ForecastPoint(
                    projectedDate,
                    BigDecimal.valueOf(projectedValue).setScale(2, RoundingMode.HALF_UP)));
        }

        return new ForecastDto(historical, projected);
    }

    private List<SalesFeign.SalesSeriesPoint> safeSeries(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.salesSeries(from, to, warehouseId); }
        catch (Exception e) {
            log.warn("sales.series failed for forecast: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
