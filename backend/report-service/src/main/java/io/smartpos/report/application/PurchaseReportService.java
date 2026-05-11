package io.smartpos.report.application;

import io.smartpos.report.api.dto.CategoryBucket;
import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.PurchaseSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseReportService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, #warehouseId, 'purch')",
               unless = "#result == null")
    public PurchaseSummaryDto summary(LocalDate from, LocalDate to, UUID warehouseId) {
        SalesFeign.PurchaseStats p = safeStats(from, to, warehouseId);
        BigDecimal avg = p.count() == 0 ? BigDecimal.ZERO
                : nz(p.gross()).divide(BigDecimal.valueOf(p.count()), 4, RoundingMode.HALF_UP);

        List<DashboardDto.SeriesPoint> series = Collections.emptyList();

        return new PurchaseSummaryDto(from, to, p.count(),
                nz(p.gross()), nz(p.paid()), nz(p.due()), avg,
                series, Collections.emptyList());
    }

    private SalesFeign.PurchaseStats safeStats(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.purchaseStats(from, to, warehouseId); }
        catch (Exception e) { return new SalesFeign.PurchaseStats(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO); }
    }

    public List<CategoryBucket> byCategory(LocalDate from, LocalDate to, UUID warehouseId) {
        // TODO: wire to purchase-by-category query
        return List.of();
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
