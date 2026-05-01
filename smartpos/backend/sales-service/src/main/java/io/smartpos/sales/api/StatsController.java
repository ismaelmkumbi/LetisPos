package io.smartpos.sales.api;

import io.smartpos.sales.application.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Internal aggregation endpoints used by Report Service. Permissions use
 * {@code report.sales} so only service accounts / admins can hit them.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService stats;

    @GetMapping("/sales/stats")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('sale.view')")
    public StatsService.SaleStats salesStats(@RequestParam(required = false) LocalDate dateFrom,
                                             @RequestParam(required = false) LocalDate dateTo,
                                             @RequestParam(required = false) UUID warehouseId,
                                             @RequestParam(required = false) UUID customerId) {
        return stats.salesStats(dateFrom, dateTo, warehouseId, customerId);
    }

    @GetMapping("/sales/top-products")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('sale.view')")
    public List<StatsService.TopProduct> topProducts(@RequestParam(required = false) LocalDate dateFrom,
                                                     @RequestParam(required = false) LocalDate dateTo,
                                                     @RequestParam(required = false) UUID warehouseId,
                                                     @RequestParam(defaultValue = "10") int limit) {
        return stats.topProducts(dateFrom, dateTo, warehouseId, limit);
    }

    @GetMapping("/sales/top-customers")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('sale.view')")
    public List<StatsService.TopCustomer> topCustomers(@RequestParam(required = false) LocalDate dateFrom,
                                                       @RequestParam(required = false) LocalDate dateTo,
                                                       @RequestParam(defaultValue = "10") int limit) {
        return stats.topCustomers(dateFrom, dateTo, limit);
    }

    @GetMapping("/sales/series")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('sale.view')")
    public List<StatsService.SalesSeriesPoint> salesSeries(@RequestParam(required = false) LocalDate dateFrom,
                                                           @RequestParam(required = false) LocalDate dateTo,
                                                           @RequestParam(required = false) UUID warehouseId) {
        return stats.salesDailySeries(dateFrom, dateTo, warehouseId);
    }

    @GetMapping("/purchases/stats")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('purchase.view')")
    public StatsService.PurchaseStats purchaseStats(@RequestParam(required = false) LocalDate dateFrom,
                                                    @RequestParam(required = false) LocalDate dateTo,
                                                    @RequestParam(required = false) UUID warehouseId) {
        return stats.purchaseStats(dateFrom, dateTo, warehouseId);
    }
}
