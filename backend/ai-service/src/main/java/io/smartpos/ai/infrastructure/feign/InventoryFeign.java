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

    record StockLevel(UUID productId, String productName, BigDecimal quantity,
                      String warehouseName, BigDecimal reorderLevel) {}

    record ExpiringItem(UUID productId, String productName, LocalDate expiryDate,
                        BigDecimal quantity) {}

    @GetMapping("/api/v1/inventory/stock-levels")
    List<StockLevel> stockLevels(@RequestParam List<UUID> productIds,
                                  @RequestParam(required = false) UUID warehouseId);

    @GetMapping("/api/v1/inventory/expiring")
    List<ExpiringItem> expiringSoon(@RequestParam int days);

    @GetMapping("/api/v1/inventory/low-stock")
    List<StockLevel> lowStock();

    @PostMapping("/api/v1/inventory/adjust")
    void adjustStock(@RequestParam UUID productId, @RequestParam int quantity,
                     @RequestParam String reason);
}
