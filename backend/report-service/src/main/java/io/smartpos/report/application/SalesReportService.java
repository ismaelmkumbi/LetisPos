package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.DiscountVoidAnalysis;
import io.smartpos.report.api.dto.HourlyBucket;
import io.smartpos.report.api.dto.SalesSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SalesReportService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_SALES_SUMMARY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, #warehouseId, #customerId)",
               unless = "#result == null")
    public SalesSummaryDto summary(LocalDate from, LocalDate to,
                                   LocalDate priorFrom, LocalDate priorTo,
                                   UUID warehouseId, UUID customerId) {
        SalesFeign.SaleStats s = sales.salesStats(from, to, warehouseId, customerId);
        List<SalesFeign.SalesSeriesPoint> series = sales.salesSeries(from, to, warehouseId);
        BigDecimal avg = s.count() == 0 ? BigDecimal.ZERO
                : nz(s.net()).divide(BigDecimal.valueOf(s.count()), 4, RoundingMode.HALF_UP);

        // Prior period — fetched separately so the primary call can still be cached
        SalesFeign.SaleStats prior = sales.salesStats(priorFrom, priorTo, warehouseId, customerId);
        BigDecimal priorNet = nz(prior.net());
        BigDecimal netChange = nz(s.net()).subtract(priorNet);
        BigDecimal netChangePercent = priorNet.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : netChange.divide(priorNet, 4, RoundingMode.HALF_UP);

        return new SalesSummaryDto(from, to, s.count(),
                nz(s.gross()), nz(s.tax()), nz(s.discount()),
                nz(s.net()), nz(s.paid()), nz(s.due()), avg,
                priorNet, netChange, netChangePercent,
                series.stream().map(p -> new DashboardDto.SeriesPoint(p.date(), nz(p.net()), p.count())).toList());
    }

    @Cacheable(value = RedisCacheConfig.CACHE_TOP_PRODUCTS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, #warehouseId, #limit)",
               unless = "#result == null")
    public List<SalesFeign.TopProduct> topProducts(LocalDate from, LocalDate to,
                                                   UUID warehouseId, int limit) {
        return sales.topProducts(from, to, warehouseId, limit);
    }

    @Cacheable(value = RedisCacheConfig.CACHE_TOP_CUSTOMERS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, #limit)",
               unless = "#result == null")
    public List<SalesFeign.TopCustomer> topCustomers(LocalDate from, LocalDate to, int limit) {
        return sales.topCustomers(from, to, limit);
    }

    public List<HourlyBucket> byHour(LocalDate from, LocalDate to, UUID warehouseId) {
        // TODO: wire to salesFeign hourly query
        return List.of();
    }

    public DiscountVoidAnalysis discountsVoids(LocalDate from, LocalDate to, UUID warehouseId) {
        // TODO: wire to real discount/void analytics
        return new DiscountVoidAnalysis(BigDecimal.ZERO, 0, BigDecimal.ZERO, 0, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
