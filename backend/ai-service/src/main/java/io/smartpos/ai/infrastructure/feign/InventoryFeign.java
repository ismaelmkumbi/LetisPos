package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "inventory-service",
    url = "${smartpos.ai.inventory-service-url:http://localhost:8084}")
public interface InventoryFeign {

    record StockAlertItem(UUID id, UUID productId, UUID warehouseId,
                          BigDecimal onHand, BigDecimal available,
                          int stockAlertThreshold) {}

    record ExpiringItem(UUID id, String productName, LocalDate expiryDate,
                        BigDecimal quantity) {}

    // Real inventory-service endpoints:

    @GetMapping("/api/v1/stock/alerts")
    org.springframework.data.domain.Page<StockAlertItem> lowStockAlerts(
        @RequestParam(required = false) UUID warehouseId,
        org.springframework.data.domain.Pageable pageable);

    @GetMapping("/api/v1/stock")
    java.util.Map<String, Object> stockLevel(
        @RequestParam UUID productId,
        @RequestParam(required = false) UUID warehouseId);

    @GetMapping("/api/v1/batches/expiring")
    List<ExpiringItem> expiringSoon(@RequestParam(defaultValue = "30") int days);

    @GetMapping("/api/v1/stock/summary")
    java.util.Map<String, Object> warehouseSummary(
        @RequestParam(required = false) UUID warehouseId);
}
