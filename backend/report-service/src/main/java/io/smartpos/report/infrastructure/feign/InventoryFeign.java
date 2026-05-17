package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "inventory-service")
public interface InventoryFeign {

    record WarehouseSummary(long distinctProducts, BigDecimal totalOnHand,
                            BigDecimal totalReserved, BigDecimal totalAvailable,
                            long lowStockLines) {}

    @GetMapping("/api/v1/stock/summary")
    WarehouseSummary summary(@RequestParam(value = "warehouseId", required = false) UUID warehouseId);

    // ----- Phase 6c: nightly inventory snapshot inputs -----

    record WarehouseRef(UUID id, String code, String name, String city, String country,
                        String phone, String email, String zip, String notes, boolean active) {}

    @GetMapping("/api/v1/warehouses")
    List<WarehouseRef> warehouses();

    record StockLevel(UUID id, UUID productId, UUID variantId, UUID warehouseId,
                      BigDecimal onHand, BigDecimal reserved, BigDecimal available,
                      int stockAlertThreshold, long version) {}

    /**
     * Paginated stock levels for a single warehouse. The snapshot job walks
     * pages until {@code content} is empty.
     */
    record StockLevelPage(List<StockLevel> content, int number, int size, int totalPages, long totalElements) {}

    record ReorderSuggestion(UUID productId, String productName, int currentStock,
                             int suggestedQty, int minQty, UUID supplierId,
                             String urgency, double dailyVelocity,
                             LocalDate expectedShortageDate) {}

    @GetMapping("/api/v1/inventory/reorder-suggestions")
    List<ReorderSuggestion> reorderSuggestions();

    @GetMapping("/api/v1/stock/levels")
    StockLevelPage levels(@RequestParam UUID warehouseId,
                          @RequestParam(defaultValue = "0") int page,
                          @RequestParam(defaultValue = "200") int size);
}
