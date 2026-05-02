package io.smartpos.report.api;

import io.smartpos.report.api.dto.AdvancedReports.*;
import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.api.dto.ProfitLossDto;
import io.smartpos.report.api.dto.SalesSummaryDto;
import io.smartpos.report.application.AdvancedReportService;
import io.smartpos.report.application.DashboardService;
import io.smartpos.report.application.InventoryReportService;
import io.smartpos.report.application.ProfitLossService;
import io.smartpos.report.application.SalesReportService;
import io.smartpos.report.infrastructure.feign.InventoryFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import org.springframework.format.annotation.DateTimeFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final DashboardService        dashboardService;
    private final SalesReportService      salesReports;
    private final InventoryReportService  inventoryReports;
    private final ProfitLossService       profitLoss;
    private final AdvancedReportService   advanced;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial') " +
                  "or hasAuthority('report.inventory')")
    public DashboardDto dashboard(@RequestParam(required = false) UUID warehouseId,
                                  @RequestParam(defaultValue = "MONTH") Period period) {
        return dashboardService.dashboard(warehouseId, period);
    }

    // ---- Sales reports ----

    @GetMapping("/sales/summary")
    @PreAuthorize("hasAuthority('report.sales')")
    public SalesSummaryDto salesSummary(@RequestParam(required = false) LocalDate dateFrom,
                                        @RequestParam(required = false) LocalDate dateTo,
                                        @RequestParam(required = false) UUID warehouseId,
                                        @RequestParam(required = false) UUID customerId) {
        return salesReports.summary(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId, customerId);
    }

    @GetMapping("/sales/top-products")
    @PreAuthorize("hasAuthority('report.sales')")
    public List<SalesFeign.TopProduct> topProducts(@RequestParam(required = false) LocalDate dateFrom,
                                                   @RequestParam(required = false) LocalDate dateTo,
                                                   @RequestParam(required = false) UUID warehouseId,
                                                   @RequestParam(defaultValue = "10") int limit) {
        return salesReports.topProducts(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId, limit);
    }

    @GetMapping("/sales/top-customers")
    @PreAuthorize("hasAuthority('report.sales')")
    public List<SalesFeign.TopCustomer> topCustomers(@RequestParam(required = false) LocalDate dateFrom,
                                                     @RequestParam(required = false) LocalDate dateTo,
                                                     @RequestParam(defaultValue = "10") int limit) {
        return salesReports.topCustomers(defaultFrom(dateFrom), defaultTo(dateTo), limit);
    }

    // ---- Inventory reports ----

    @GetMapping("/inventory/summary")
    @PreAuthorize("hasAuthority('report.inventory')")
    public InventoryFeign.WarehouseSummary inventorySummary(@RequestParam(required = false) UUID warehouseId) {
        return inventoryReports.summary(warehouseId);
    }

    // ---- Profit & Loss ----

    @GetMapping("/profit-loss")
    @PreAuthorize("hasAuthority('report.financial')")
    public ProfitLossDto profitLoss(@RequestParam(required = false) LocalDate dateFrom,
                                    @RequestParam(required = false) LocalDate dateTo) {
        return profitLoss.profitLoss(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Advanced (Stocky parity) reports ----

    @GetMapping("/warranty")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.inventory')")
    public WarrantyReport warranty(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return advanced.warranty(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    @GetMapping("/dead-stock")
    @PreAuthorize("hasAuthority('report.inventory')")
    public DeadStockReport deadStock(@RequestParam(defaultValue = "60") int lookbackDays,
                                     @RequestParam(required = false) UUID warehouseId) {
        return advanced.deadStock(lookbackDays, warehouseId);
    }

    @GetMapping("/inventory-valuation")
    @PreAuthorize("hasAuthority('report.inventory')")
    public InventoryValuationReport inventoryValuation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf,
            @RequestParam(defaultValue = "AVG") String method,
            @RequestParam(required = false) UUID warehouseId) {
        return advanced.inventoryValuation(asOf, method, warehouseId);
    }

    @GetMapping("/sales-by-dimension")
    @PreAuthorize("hasAuthority('report.sales')")
    public SalesByDimensionReport salesByDimension(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "CATEGORY") String dimension) {
        return advanced.salesByDimension(defaultFrom(dateFrom), defaultTo(dateTo), dimension);
    }

    // ---- helpers ----

    private static LocalDate defaultFrom(LocalDate v) {
        return v != null ? v : LocalDate.now().withDayOfMonth(1);
    }
    private static LocalDate defaultTo(LocalDate v) {
        return v != null ? v : LocalDate.now();
    }
}
