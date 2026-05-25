package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Pulls aggregated facts from report-service so the AI can reason over real
 * numbers instead of fabricating them. We deliberately ask for compact summaries
 * (top-N, bucketed totals) — never raw rows — to keep prompt tokens small.
 */
@FeignClient(name = "report-service", url = "${smartpos.ai.report-service-url:http://localhost:8087}")
public interface ReportFeign {

    /**
     * Mirrors report-service SalesSummaryDto. Field names MUST match the
     * upstream record (`count`, `avgSale`) — Jackson silently drops mismatches
     * and the primitive long would read 0, which would tell the assistant
     * "15.7M gross from 0 sales". Convenience aliases on top.
     */
    record SalesSummary(LocalDate from, LocalDate to,
                        long count, BigDecimal gross, BigDecimal tax,
                        BigDecimal discount, BigDecimal net,
                        BigDecimal paid, BigDecimal due,
                        BigDecimal avgSale) {
        /** Legacy alias retained for existing callers. */
        public long salesCount() { return count; }
        /** Legacy alias retained for existing callers. */
        public BigDecimal averageBasket() { return avgSale; }
    }

    @GetMapping("/api/v1/reports/sales/summary")
    SalesSummary salesSummary(@RequestParam(required = false) String dateFrom,
                              @RequestParam(required = false) String dateTo,
                              @RequestParam(required = false) UUID warehouseId,
                              @RequestParam(required = false) UUID customerId);

    record TopProduct(UUID productId, String productName, BigDecimal qty, BigDecimal net) {}

    @GetMapping("/api/v1/reports/sales/top-products")
    List<TopProduct> topProducts(@RequestParam(required = false) String dateFrom,
                                 @RequestParam(required = false) String dateTo,
                                 @RequestParam(required = false) UUID warehouseId,
                                 @RequestParam(defaultValue = "10") int limit);

    record TopCustomer(UUID customerId, String customerName, long sales, BigDecimal net) {}

    @GetMapping("/api/v1/reports/sales/top-customers")
    List<TopCustomer> topCustomers(@RequestParam(required = false) String dateFrom,
                                   @RequestParam(required = false) String dateTo,
                                   @RequestParam(defaultValue = "10") int limit);
}
