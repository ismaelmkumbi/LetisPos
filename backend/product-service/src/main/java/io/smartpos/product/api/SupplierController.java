package io.smartpos.product.api;

import io.smartpos.product.api.dto.SupplierDto;
import io.smartpos.product.application.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService service;

    @GetMapping
    @PreAuthorize("hasAuthority('supplier.manage')")
    public Page<SupplierDto> list(@RequestParam(required = false) String search,
                                  @RequestParam(required = false) Boolean active,
                                  Pageable pageable) {
        return service.search(search, active, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier.manage')")
    public SupplierDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('supplier.manage')")
    public ResponseEntity<SupplierDto> create(@Valid @RequestBody SupplierDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier.manage')")
    public SupplierDto update(@PathVariable UUID id, @Valid @RequestBody SupplierDto.CreateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasAuthority('supplier.manage')")
    public SupplierDto toggleActive(@PathVariable UUID id) {
        return service.toggleActive(id);
    }
}
