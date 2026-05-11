package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.CreateProductBatchRequest;
import io.smartpos.inventory.api.dto.ProductBatchDto;
import io.smartpos.inventory.application.ProductBatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
public class ProductBatchController {

    private final ProductBatchService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public Page<ProductBatchDto> list(
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) UUID warehouseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate expiringBefore,
            @RequestParam(required = false) LocalDate expiringAfter,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return service.listBatches(productId, warehouseId, status,
                expiringBefore, expiringAfter, search, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.view')")
    public ProductBatchDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.count')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductBatchDto create(@Valid @RequestBody CreateProductBatchRequest req) {
        return service.create(req);
    }

    @GetMapping("/expiring")
    @PreAuthorize("hasAuthority('product.view')")
    public List<ProductBatchDto> expiring(
            @RequestParam(required = false) UUID warehouseId,
            @RequestParam(defaultValue = "30") int withinDays) {
        return service.getExpiring(warehouseId, withinDays);
    }
}
