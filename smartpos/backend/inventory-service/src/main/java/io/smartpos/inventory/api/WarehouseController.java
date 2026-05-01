package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.WarehouseDto;
import io.smartpos.inventory.application.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")  // everyone logged in can read the list
    public List<WarehouseDto> list() { return service.list(); }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public WarehouseDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('warehouse.manage')")
    public ResponseEntity<WarehouseDto> create(@Valid @RequestBody WarehouseDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('warehouse.manage')")
    public WarehouseDto update(@PathVariable UUID id, @Valid @RequestBody WarehouseDto.CreateRequest req) {
        return service.update(id, req);
    }
}
