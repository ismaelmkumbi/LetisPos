package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Pulls filtered sales data from sales-service for AI analytics.
 * Uses the existing search and reporting endpoints.
 */
@FeignClient(name = "sales-service", url = "${smartpos.ai.sales-service-url:http://localhost:8085}")
public interface SalesFeign {

    // ---- Sale search (paginated) ----

    record SalePage(List<SaleSummary> content, int totalPages, long totalElements,
                    int number, int size) {}

    record SaleSummary(
            UUID id, String ref, LocalDate date,
            UUID customerId, UUID warehouseId, UUID userId,
            String status, String paymentStatus,
            BigDecimal subtotal, BigDecimal taxTotal,
            BigDecimal discountTotal, BigDecimal grandTotal,
            BigDecimal paidTotal, String currency,
            List<SaleLineSummary> lines,
            Instant createdAt, Instant confirmedAt
    ) {}

    record SaleLineSummary(
            UUID id, UUID productId, UUID variantId,
            String productName, String productCode,
            BigDecimal unitPrice, BigDecimal qty,
            BigDecimal discount, String discountType,
            BigDecimal taxRate, String taxMethod,
            BigDecimal lineSubtotal, BigDecimal lineTax, BigDecimal lineTotal
    ) {}

    @GetMapping("/api/v1/sales")
    SalePage search(@RequestParam(required = false) LocalDate dateFrom,
                    @RequestParam(required = false) LocalDate dateTo,
                    @RequestParam(required = false) UUID customerId,
                    @RequestParam(required = false) UUID warehouseId,
                    @RequestParam(required = false) String status,
                    @RequestParam(defaultValue = "0") int page,
                    @RequestParam(defaultValue = "1000") int size);
}
