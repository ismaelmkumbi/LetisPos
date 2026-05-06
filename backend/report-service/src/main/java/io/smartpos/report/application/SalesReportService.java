package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
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
                                   UUID warehouseId, UUID customerId) {
        SalesFeign.SaleStats s = sales.salesStats(from, to, warehouseId, customerId);
        List<SalesFeign.SalesSeriesPoint> series = sales.salesSeries(from, to, warehouseId);
        BigDecimal avg = s.count() == 0 ? BigDecimal.ZERO
                : nz(s.net()).divide(BigDecimal.valueOf(s.count()), 4, RoundingMode.HALF_UP);
        return new SalesSummaryDto(from, to, s.count(),
                nz(s.gross()), nz(s.tax()), nz(s.discount()),
                nz(s.net()), nz(s.paid()), nz(s.due()), avg,
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

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
