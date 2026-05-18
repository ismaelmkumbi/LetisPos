package io.smartpos.sales.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Feign client for the Inventory Service. Only exposes the endpoints Sales
 * Service actually calls — the reservation saga + adjustment on
 * purchase receipt.
 */
@FeignClient(name = "inventory-service")
public interface InventoryClient {

    record ReservationLine(UUID productId, UUID variantId, UUID warehouseId, BigDecimal qty) {}

    record ReserveRequest(UUID saleId, List<ReservationLine> lines, Integer ttlMinutes) {}

    record ReservationResponse(UUID id, UUID saleId, List<ReservationLine> lines,
                               Instant expiresAt, String status) {}

    @PostMapping("/api/v1/stock/reservations")
    ResponseEntity<ReservationResponse> reserve(@RequestBody ReserveRequest req);

    @PostMapping("/api/v1/stock/reservations/{saleId}/commit")
    ResponseEntity<Void> commit(@PathVariable("saleId") UUID saleId);

    @DeleteMapping("/api/v1/stock/reservations/{saleId}")
    ResponseEntity<Void> release(@PathVariable("saleId") UUID saleId);

    // --- For purchase receipt — create an ADJUSTMENT that increments stock ---

    record AdjustmentLine(UUID productId, UUID variantId, BigDecimal qtyDelta, BigDecimal unitCost) {}

    record CreateAdjustmentRequest(
            UUID warehouseId,
            java.time.LocalDate date,
            String reason,
            String notes,
            List<AdjustmentLine> lines) {}

    record AdjustmentResponse(UUID id, String ref) {}

    @PostMapping("/api/v1/adjustments")
    ResponseEntity<AdjustmentResponse> createAdjustment(@RequestBody CreateAdjustmentRequest req);
}
