package io.smartpos.report.application;

import io.smartpos.report.api.dto.Period;
import io.smartpos.report.api.dto.TopPerformerDto;
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
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TopPerformersService {

    private final SalesFeign sales;

    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#warehouseId, 'topProducts-' + #limit)",
               unless = "#result == null")
    public List<TopPerformerDto> topProducts(UUID warehouseId, Period period, int limit) {
        TenantContext.require();
        LocalDate today = LocalDate.now();
        LocalDate from = period.from(today);
        LocalDate to   = period.to(today);

        List<SalesFeign.TopProduct> rows = safeTopProducts(from, to, warehouseId, limit);
        if (rows.isEmpty()) return Collections.emptyList();

        BigDecimal total = rows.stream()
                .map(SalesFeign.TopProduct::revenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream().map(r -> {
            BigDecimal pct = total.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : r.revenue().multiply(BigDecimal.valueOf(100))
                            .divide(total, 2, RoundingMode.HALF_UP);
            return new TopPerformerDto(r.productId(), r.productName(), r.revenue(), pct);
        }).toList();
    }

    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#warehouseId, 'topCustomers-' + #limit)",
               unless = "#result == null")
    public List<TopPerformerDto> topCustomers(UUID warehouseId, Period period, int limit) {
        TenantContext.require();
        LocalDate today = LocalDate.now();
        LocalDate from = period.from(today);
        LocalDate to   = period.to(today);

        List<SalesFeign.TopCustomer> rows = safeTopCustomers(from, to, limit);
        if (rows.isEmpty()) return Collections.emptyList();

        BigDecimal total = rows.stream()
                .map(SalesFeign.TopCustomer::totalSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream().map(r -> {
            BigDecimal pct = total.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : r.totalSpent().multiply(BigDecimal.valueOf(100))
                            .divide(total, 2, RoundingMode.HALF_UP);
            // Customer name not available from sales-service; use ID prefix as label
            String name = "Customer " + r.customerId().toString().substring(0, 8);
            return new TopPerformerDto(r.customerId(), name, r.totalSpent(), pct);
        }).toList();
    }

    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#warehouseId, 'topSuppliers-' + #limit)",
               unless = "#result == null")
    public List<TopPerformerDto> topSuppliers(UUID warehouseId, Period period, int limit) {
        TenantContext.require();
        LocalDate today = LocalDate.now();
        LocalDate from = period.from(today);
        LocalDate to   = period.to(today);

        List<SalesFeign.TopSupplier> rows = safeTopSuppliers(from, to, warehouseId, limit);
        if (rows.isEmpty()) return Collections.emptyList();

        BigDecimal total = rows.stream()
                .map(SalesFeign.TopSupplier::totalSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream().map(r -> {
            BigDecimal pct = total.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : r.totalSpent().multiply(BigDecimal.valueOf(100))
                            .divide(total, 2, RoundingMode.HALF_UP);
            // Supplier name not available from sales-service; use ID prefix as label
            String name = "Supplier " + r.supplierId().toString().substring(0, 8);
            return new TopPerformerDto(r.supplierId(), name, r.totalSpent(), pct);
        }).toList();
    }

    private List<SalesFeign.TopProduct> safeTopProducts(LocalDate from, LocalDate to, UUID warehouseId, int limit) {
        try { return sales.topProducts(from, to, warehouseId, limit); }
        catch (Exception e) { log.warn("topProducts failed: {}", e.getMessage()); return Collections.emptyList(); }
    }

    private List<SalesFeign.TopCustomer> safeTopCustomers(LocalDate from, LocalDate to, int limit) {
        try { return sales.topCustomers(from, to, limit); }
        catch (Exception e) { log.warn("topCustomers failed: {}", e.getMessage()); return Collections.emptyList(); }
    }

    private List<SalesFeign.TopSupplier> safeTopSuppliers(LocalDate from, LocalDate to, UUID warehouseId, int limit) {
        try { return sales.topSuppliers(from, to, warehouseId, limit); }
        catch (Exception e) { log.warn("topSuppliers failed: {}", e.getMessage()); return Collections.emptyList(); }
    }
}
