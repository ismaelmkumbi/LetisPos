package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "sales-service")
public interface SalesFeign {

    record SaleStats(long count, BigDecimal gross, BigDecimal tax,
                     BigDecimal discount, BigDecimal net,
                     BigDecimal paid, BigDecimal due) {}

    record TopProduct(UUID productId, String productName, BigDecimal qty, BigDecimal revenue) {}

    record TopCustomer(UUID customerId, BigDecimal totalSpent, long orderCount) {}

    record SalesSeriesPoint(LocalDate date, BigDecimal net, long count) {}

    record TopSupplier(UUID supplierId, long orderCount, BigDecimal totalSpent) {}

    record PurchaseStats(long count, BigDecimal gross, BigDecimal paid, BigDecimal due) {}

    record SalesByUser(UUID userId, String userName, long saleCount,
                       BigDecimal totalNet, BigDecimal totalGross, long itemsSold) {}

    @GetMapping("/api/v1/sales/stats")
    SaleStats salesStats(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                         @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                         @RequestParam(value = "warehouseId", required = false) UUID warehouseId,
                         @RequestParam(value = "customerId",  required = false) UUID customerId);

    @GetMapping("/api/v1/sales/top-products")
    List<TopProduct> topProducts(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                 @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                                 @RequestParam(value = "warehouseId", required = false) UUID warehouseId,
                                 @RequestParam(value = "limit", defaultValue = "10") int limit);

    @GetMapping("/api/v1/sales/top-customers")
    List<TopCustomer> topCustomers(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                   @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                                   @RequestParam(value = "limit", defaultValue = "10") int limit);

    @GetMapping("/api/v1/sales/series")
    List<SalesSeriesPoint> salesSeries(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                       @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                                       @RequestParam(value = "warehouseId", required = false) UUID warehouseId);

    @GetMapping("/api/v1/sales/cogs")
    BigDecimal costOfGoodsSold(@RequestParam("dateFrom") LocalDate dateFrom,
                               @RequestParam("dateTo") LocalDate dateTo,
                               @RequestParam(value = "warehouseId", required = false) UUID warehouseId);

    @GetMapping("/api/v1/sales/by-user")
    List<SalesByUser> salesByUser(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                   @RequestParam(value = "dateTo", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo);

    @GetMapping("/api/v1/purchases/stats")
    PurchaseStats purchaseStats(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                                @RequestParam(value = "warehouseId", required = false) UUID warehouseId);

    @GetMapping("/api/v1/purchases/top-suppliers")
    List<TopSupplier> topSuppliers(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                    @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                                    @RequestParam(value = "warehouseId", required = false) UUID warehouseId,
                                    @RequestParam(value = "limit", defaultValue = "10") int limit);
}
