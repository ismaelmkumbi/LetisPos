package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.InventoryFeign;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Assembles a full dashboard payload via parallel-friendly Feign calls.
 *
 * For Phase 6 v1 each dashboard render fans out ~5 Feign requests. With 5 min
 * Redis caching per (warehouse, period) tuple this is fine for dozens of
 * concurrent users — the first request warms the cache for everyone else.
 *
 * Phase 6b will pre-populate fact tables via Kafka consumers and this service
 * will read from there instead.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SalesFeign     sales;
    private final InventoryFeign inventory;
    private final PaymentFeign   payments;

    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD,
               key = "#warehouseId + ':' + #period.name()",
               unless = "#result == null")
    public DashboardDto dashboard(UUID warehouseId, Period period) {
        LocalDate today = LocalDate.now();
        LocalDate from = period.from(today);
        LocalDate to   = period.to(today);

        SalesFeign.SaleStats      s     = safeSalesStats(from, to, warehouseId);
        SalesFeign.PurchaseStats  p     = safePurchaseStats(from, to, warehouseId);
        PaymentFeign.PaymentStats pay   = safePayStats(from, to);
        PaymentFeign.ExpenseStats exp   = safeExpenseStats(from, to);
        InventoryFeign.WarehouseSummary inv = safeInventorySummary(warehouseId);
        List<SalesFeign.SalesSeriesPoint> series = safeSeries(from, to, warehouseId);
        List<SalesFeign.TopProduct>       tp     = safeTopProducts(from, to, warehouseId);

        // Net profit (rough) = sales.net - purchases.net (≈cogs) - expenses.total
        BigDecimal cogs = nz(p.gross()).subtract(BigDecimal.ZERO);   // purchases gross treated as cost
        BigDecimal netProfit = nz(s.net()).subtract(cogs).subtract(nz(exp.total()));

        return new DashboardDto(
                from, to,
                new DashboardDto.Sales(s.count(), nz(s.gross()), nz(s.tax()),
                        nz(s.discount()), nz(s.net()), nz(s.paid()), nz(s.due())),
                new DashboardDto.Purchases(p.count(), nz(p.gross()), nz(p.paid()), nz(p.due())),
                new DashboardDto.Payments(pay.count(), nz(pay.totalIn()), nz(pay.totalOut())),
                new DashboardDto.Expenses(nz(exp.total()), exp.count()),
                new DashboardDto.Inventory(inv.distinctProducts(), nz(inv.totalOnHand()),
                        nz(inv.totalAvailable()), inv.lowStockLines()),
                series.stream().map(pt -> new DashboardDto.SeriesPoint(pt.date(), nz(pt.net()), pt.count())).toList(),
                tp.stream().map(x -> new DashboardDto.TopProduct(
                        x.productId().toString(), x.productName(), nz(x.qty()), nz(x.revenue()))).toList(),
                netProfit
        );
    }

    // ---- Resilient wrappers — a single broken downstream shouldn't blank the dashboard ----

    private SalesFeign.SaleStats safeSalesStats(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.salesStats(from, to, warehouseId, null); }
        catch (Exception e) { log.warn("sales.salesStats failed: {}", e.getMessage()); return empty(); }
    }
    private SalesFeign.PurchaseStats safePurchaseStats(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.purchaseStats(from, to, warehouseId); }
        catch (Exception e) { log.warn("sales.purchaseStats failed: {}", e.getMessage());
            return new SalesFeign.PurchaseStats(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO); }
    }
    private PaymentFeign.PaymentStats safePayStats(LocalDate from, LocalDate to) {
        try { return payments.paymentStats(from, to, null); }
        catch (Exception e) { log.warn("payments.paymentStats failed: {}", e.getMessage());
            return new PaymentFeign.PaymentStats(0, BigDecimal.ZERO, BigDecimal.ZERO); }
    }
    private PaymentFeign.ExpenseStats safeExpenseStats(LocalDate from, LocalDate to) {
        try { return payments.expenseStats(from, to); }
        catch (Exception e) { log.warn("payments.expenseStats failed: {}", e.getMessage());
            return new PaymentFeign.ExpenseStats(BigDecimal.ZERO, 0); }
    }
    private InventoryFeign.WarehouseSummary safeInventorySummary(UUID warehouseId) {
        try { return inventory.summary(warehouseId); }
        catch (Exception e) { log.warn("inventory.summary failed: {}", e.getMessage());
            return new InventoryFeign.WarehouseSummary(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0); }
    }
    private List<SalesFeign.SalesSeriesPoint> safeSeries(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.salesSeries(from, to, warehouseId); }
        catch (Exception e) { log.warn("sales.series failed: {}", e.getMessage()); return Collections.emptyList(); }
    }
    private List<SalesFeign.TopProduct> safeTopProducts(LocalDate from, LocalDate to, UUID warehouseId) {
        try { return sales.topProducts(from, to, warehouseId, 5); }
        catch (Exception e) { log.warn("sales.topProducts failed: {}", e.getMessage()); return Collections.emptyList(); }
    }

    private static SalesFeign.SaleStats empty() {
        BigDecimal z = BigDecimal.ZERO;
        return new SalesFeign.SaleStats(0, z, z, z, z, z, z);
    }
    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
