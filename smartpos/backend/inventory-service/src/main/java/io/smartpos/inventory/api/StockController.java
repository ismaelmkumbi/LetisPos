package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.ReservationDto;
import io.smartpos.inventory.api.dto.StockLevelDto;
import io.smartpos.inventory.application.InventoryStatsService;
import io.smartpos.inventory.application.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService service;
    private final InventoryStatsService stats;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.view')")
    public StockLevelDto get(@RequestParam UUID productId,
                             @RequestParam(required = false) UUID variantId,
                             @RequestParam UUID warehouseId) {
        return service.find(productId, variantId, warehouseId);
    }

    @GetMapping("/levels")
    @PreAuthorize("hasAuthority('stock.view')")
    public Page<StockLevelDto> listByWarehouse(@RequestParam UUID warehouseId, Pageable pageable) {
        return service.listByWarehouse(warehouseId, pageable);
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasAuthority('stock.view')")
    public Page<StockLevelDto> lowStock(@RequestParam(required = false) UUID warehouseId, Pageable pageable) {
        return service.lowStock(warehouseId, pageable);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('report.inventory') or hasAuthority('stock.view')")
    public InventoryStatsService.WarehouseSummary summary(@RequestParam(required = false) UUID warehouseId) {
        return stats.summary(warehouseId);
    }

    // ---- Reservations (POS saga) ----

    @PostMapping("/reservations")
    @PreAuthorize("hasAuthority('sale.create') or hasAuthority('pos.use')")
    public ResponseEntity<ReservationDto.Response> reserve(@Valid @RequestBody ReservationDto.CreateRequest req,
                                                           @AuthenticationPrincipal Jwt jwt) {
        UUID userId = userIdFrom(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.reserve(req, userId));
    }

    @PostMapping("/reservations/{saleId}/commit")
    @PreAuthorize("hasAuthority('sale.create') or hasAuthority('pos.use')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void commit(@PathVariable UUID saleId, @AuthenticationPrincipal Jwt jwt) {
        service.commit(saleId, userIdFrom(jwt));
    }

    @DeleteMapping("/reservations/{saleId}")
    @PreAuthorize("hasAuthority('sale.create') or hasAuthority('pos.use')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void release(@PathVariable UUID saleId) {
        service.release(saleId);
    }

    private static UUID userIdFrom(Jwt jwt) {
        return jwt == null ? null : UUID.fromString(jwt.getSubject());
    }
}
