package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Read-only views into product-service for advanced reports.
 * Warranty queries hit the IMEI/serial registry (product-service V2).
 */
@FeignClient(name = "product-service")
public interface ProductFeign {

    record SerialView(
            UUID id, UUID productId, UUID variantId, UUID warehouseId,
            String serialNumber, String serialType, String status,
            String purchaseRef, String saleRef,
            LocalDate warrantyStart, LocalDate warrantyEnd) {}

    record SerialPage(List<SerialView> content, int number, int size, int totalPages, long totalElements) {}

    @GetMapping("/api/v1/serials")
    SerialPage searchSerials(@RequestParam(required = false) UUID productId,
                             @RequestParam(required = false) UUID warehouseId,
                             @RequestParam(required = false) String status,
                             @RequestParam(required = false) String search,
                             @RequestParam(defaultValue = "0")    int page,
                             @RequestParam(defaultValue = "200")  int size);
}
