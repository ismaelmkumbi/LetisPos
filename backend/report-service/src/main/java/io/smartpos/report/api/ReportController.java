package io.smartpos.report.api;

import io.smartpos.report.api.dto.AdvancedReports.*;
import io.smartpos.report.api.dto.ArAging;
import io.smartpos.report.api.dto.CategoryBucket;
import io.smartpos.report.api.dto.CustomerSummaryDto;
import io.smartpos.report.api.dto.DashboardDto;
import io.smartpos.report.api.dto.DiscountVoidAnalysis;
import io.smartpos.report.api.dto.EmployeeSalesDto;
import io.smartpos.report.api.dto.FinancialReportDto;
import io.smartpos.report.api.dto.HourlyBucket;
import io.smartpos.report.api.dto.MonthlyTaxBucket;
import io.smartpos.report.api.dto.MoversReport;
import io.smartpos.report.api.dto.OperationsReportDto;
import io.smartpos.report.api.dto.PaymentSummaryDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.api.dto.ProfitLossDto;
import io.smartpos.report.api.dto.PurchaseSummaryDto;
import io.smartpos.report.api.dto.RetentionRate;
import io.smartpos.report.api.dto.RfmSegments;
import io.smartpos.report.api.dto.SalesSummaryDto;
import io.smartpos.report.api.dto.SupplierReportDto;
import io.smartpos.report.api.dto.TaxSummaryDto;
import io.smartpos.report.api.dto.TurnoverRow;
import io.smartpos.report.application.AdvancedReportService;
import io.smartpos.report.application.CustomerReportService;
import io.smartpos.report.application.DashboardService;
import io.smartpos.report.application.EmployeeReportService;
import io.smartpos.report.application.FinancialReportService;
import io.smartpos.report.application.InventoryReportService;
import io.smartpos.report.application.OperationsReportService;
import io.smartpos.report.application.PaymentReportService;
import io.smartpos.report.application.ProfitLossService;
import io.smartpos.report.application.PurchaseReportService;
import io.smartpos.report.application.SalesReportService;
import io.smartpos.report.application.SupplierReportService;
import io.smartpos.report.application.TaxReportService;
import io.smartpos.report.infrastructure.feign.InventoryFeign;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import org.springframework.format.annotation.DateTimeFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final DashboardService          dashboardService;
    private final SalesReportService        salesReports;
    private final InventoryReportService    inventoryReports;
    private final ProfitLossService         profitLoss;
    private final AdvancedReportService     advanced;
    private final TaxReportService          taxReports;
    private final PurchaseReportService     purchaseReports;
    private final PaymentReportService      paymentReports;
    private final CustomerReportService     customerReports;
    private final SupplierReportService     supplierReports;
    private final FinancialReportService    financialReports;
    private final EmployeeReportService     employeeReports;
    private final OperationsReportService   operationsReports;

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
                                        @RequestParam(required = false) LocalDate priorFrom,
                                        @RequestParam(required = false) LocalDate priorTo,
                                        @RequestParam(required = false) UUID warehouseId,
                                        @RequestParam(required = false) UUID customerId) {
        LocalDate from = defaultFrom(dateFrom);
        LocalDate to = defaultTo(dateTo);
        if (priorFrom == null) priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        if (priorTo == null) priorTo = from.minusDays(1);
        return salesReports.summary(from, to, priorFrom, priorTo, warehouseId, customerId);
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

    // ---- Tax report ----

    @GetMapping("/tax-summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public TaxSummaryDto taxSummary(@RequestParam(required = false) LocalDate dateFrom,
                                     @RequestParam(required = false) LocalDate dateTo) {
        return taxReports.summary(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Purchase report ----

    @GetMapping("/purchases/summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public PurchaseSummaryDto purchaseSummary(@RequestParam(required = false) LocalDate dateFrom,
                                               @RequestParam(required = false) LocalDate dateTo,
                                               @RequestParam(required = false) LocalDate priorFrom,
                                               @RequestParam(required = false) LocalDate priorTo,
                                               @RequestParam(required = false) UUID warehouseId) {
        LocalDate from = defaultFrom(dateFrom);
        LocalDate to = defaultTo(dateTo);
        if (priorFrom == null) priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        if (priorTo == null) priorTo = from.minusDays(1);
        return purchaseReports.summary(from, to, priorFrom, priorTo, warehouseId);
    }

    // ---- Payment report ----

    @GetMapping("/payments/summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public PaymentSummaryDto paymentSummary(@RequestParam(required = false) LocalDate dateFrom,
                                             @RequestParam(required = false) LocalDate dateTo,
                                             @RequestParam(required = false) LocalDate priorFrom,
                                             @RequestParam(required = false) LocalDate priorTo) {
        LocalDate from = defaultFrom(dateFrom);
        LocalDate to = defaultTo(dateTo);
        if (priorFrom == null) priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        if (priorTo == null) priorTo = from.minusDays(1);
        return paymentReports.summary(from, to, priorFrom, priorTo);
    }

    @GetMapping("/payments/by-method")
    @PreAuthorize("hasAuthority('report.financial')")
    public List<PaymentFeign.ByMethodRow> paymentsByMethod(@RequestParam(required = false) LocalDate dateFrom,
                                                            @RequestParam(required = false) LocalDate dateTo) {
        return paymentReports.byMethod(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Customer report ----

    @GetMapping("/customers/summary")
    @PreAuthorize("hasAuthority('report.sales')")
    public CustomerSummaryDto customerSummary(@RequestParam(required = false) LocalDate dateFrom,
                                               @RequestParam(required = false) LocalDate dateTo,
                                               @RequestParam(required = false) LocalDate priorFrom,
                                               @RequestParam(required = false) LocalDate priorTo) {
        LocalDate from = defaultFrom(dateFrom);
        LocalDate to = defaultTo(dateTo);
        if (priorFrom == null) priorFrom = from.minusDays(to.toEpochDay() - from.toEpochDay() + 1);
        if (priorTo == null) priorTo = from.minusDays(1);
        return customerReports.summary(from, to, priorFrom, priorTo);
    }

    // ---- Sales: hourly breakdown ----

    @GetMapping("/sales/by-hour")
    @PreAuthorize("hasAuthority('report.sales')")
    public List<HourlyBucket> salesByHour(@RequestParam(required = false) LocalDate dateFrom,
                                           @RequestParam(required = false) LocalDate dateTo,
                                           @RequestParam(required = false) UUID warehouseId) {
        return salesReports.byHour(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
    }

    // ---- Sales: discount/void analysis ----

    @GetMapping("/sales/discounts-voids")
    @PreAuthorize("hasAuthority('report.sales')")
    public DiscountVoidAnalysis discountsVoids(@RequestParam(required = false) LocalDate dateFrom,
                                                @RequestParam(required = false) LocalDate dateTo,
                                                @RequestParam(required = false) UUID warehouseId) {
        return salesReports.discountsVoids(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
    }

    // ---- Customer: RFM segments ----

    @GetMapping("/customers/rfm")
    @PreAuthorize("hasAuthority('report.sales')")
    public RfmSegments customerRfm(@RequestParam(required = false) LocalDate dateFrom,
                                    @RequestParam(required = false) LocalDate dateTo) {
        return customerReports.rfm(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Customer: retention rate ----

    @GetMapping("/customers/retention")
    @PreAuthorize("hasAuthority('report.sales')")
    public RetentionRate customerRetention(@RequestParam(required = false) LocalDate dateFrom,
                                            @RequestParam(required = false) LocalDate dateTo) {
        return customerReports.retention(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Purchase: by-category ----

    @GetMapping("/purchases/by-category")
    @PreAuthorize("hasAuthority('report.financial')")
    public List<CategoryBucket> purchasesByCategory(@RequestParam(required = false) LocalDate dateFrom,
                                                      @RequestParam(required = false) LocalDate dateTo,
                                                      @RequestParam(required = false) UUID warehouseId) {
        return purchaseReports.byCategory(defaultFrom(dateFrom), defaultTo(dateTo), warehouseId);
    }

    // ---- Payment: AR aging ----

    @GetMapping("/payments/aging")
    @PreAuthorize("hasAuthority('report.financial')")
    public ArAging paymentAging(@RequestParam(required = false) LocalDate asOf) {
        return paymentReports.aging(asOf != null ? asOf : LocalDate.now());
    }

    // ---- Tax: monthly schedule ----

    @GetMapping("/tax/monthly-schedule")
    @PreAuthorize("hasAuthority('report.financial')")
    public List<MonthlyTaxBucket> taxMonthlySchedule(@RequestParam(required = false) Integer year) {
        return taxReports.monthlySchedule(year != null ? year : Year.now().getValue());
    }

    // ---- Inventory: turnover ----

    @GetMapping("/inventory/turnover")
    @PreAuthorize("hasAuthority('report.inventory')")
    public List<TurnoverRow> inventoryTurnover(@RequestParam(required = false) UUID warehouseId,
                                                @RequestParam(defaultValue = "12") int months) {
        return inventoryReports.turnover(warehouseId, months);
    }

    // ---- Inventory: top/bottom movers ----

    @GetMapping("/inventory/movers")
    @PreAuthorize("hasAuthority('report.inventory')")
    public MoversReport inventoryMovers(@RequestParam(required = false) UUID warehouseId,
                                         @RequestParam(defaultValue = "20") int limit) {
        return inventoryReports.movers(warehouseId, limit);
    }

    // ---- Employee sales ----

    @GetMapping("/sales/by-employee")
    @PreAuthorize("hasAuthority('report.sales')")
    public EmployeeSalesDto salesByEmployee(@RequestParam(required = false) LocalDate dateFrom,
                                             @RequestParam(required = false) LocalDate dateTo) {
        return employeeReports.sales(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Supplier reports ----

    @GetMapping("/suppliers/summary")
    @PreAuthorize("hasAuthority('report.financial')")
    public SupplierReportDto supplierSummary(@RequestParam(required = false) LocalDate dateFrom,
                                              @RequestParam(required = false) LocalDate dateTo) {
        return supplierReports.report(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Financial reports ----

    @GetMapping("/financial/balance-sheet")
    @PreAuthorize("hasAuthority('report.financial')")
    public FinancialReportDto.BalanceSheet balanceSheet(@RequestParam(required = false) LocalDate asOf) {
        return financialReports.balanceSheet(asOf != null ? asOf : LocalDate.now());
    }

    @GetMapping("/financial/trial-balance")
    @PreAuthorize("hasAuthority('report.financial')")
    public FinancialReportDto.TrialBalance trialBalance(@RequestParam(required = false) LocalDate dateFrom,
                                                          @RequestParam(required = false) LocalDate dateTo) {
        return financialReports.trialBalance(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    @GetMapping("/financial/cash-flow")
    @PreAuthorize("hasAuthority('report.financial')")
    public FinancialReportDto.CashFlowStatement cashFlow(@RequestParam(required = false) LocalDate dateFrom,
                                                           @RequestParam(required = false) LocalDate dateTo) {
        return financialReports.cashFlow(defaultFrom(dateFrom), defaultTo(dateTo));
    }

    // ---- Operations reports ----

    @GetMapping("/operations/summary")
    @PreAuthorize("hasAuthority('report.sales')")
    public OperationsReportDto operationsSummary(@RequestParam(required = false) LocalDate date) {
        return operationsReports.report(date != null ? date : LocalDate.now());
    }

    // ---- helpers ----

    private static LocalDate defaultFrom(LocalDate v) {
        return v != null ? v : LocalDate.now().withDayOfMonth(1);
    }
    private static LocalDate defaultTo(LocalDate v) {
        return v != null ? v : LocalDate.now();
    }
}
