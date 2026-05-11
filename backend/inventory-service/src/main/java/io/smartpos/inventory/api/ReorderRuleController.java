package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.CreateReorderRuleRequest;
import io.smartpos.inventory.api.dto.ReorderRuleDto;
import io.smartpos.inventory.application.ReorderRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reorder-rules")
@RequiredArgsConstructor
public class ReorderRuleController {

    private final ReorderRuleService service;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.view')")
    public Page<ReorderRuleDto> list(Pageable pageable) { return service.list(pageable); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.view')")
    public ReorderRuleDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.count')")
    public ResponseEntity<ReorderRuleDto> create(@Valid @RequestBody CreateReorderRuleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.count')")
    public ReorderRuleDto update(@PathVariable UUID id, @Valid @RequestBody CreateReorderRuleRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.count')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    @GetMapping("/triggered")
    @PreAuthorize("hasAuthority('stock.view')")
    public List<ReorderRuleDto> triggered(@RequestParam(required = false) UUID warehouseId) {
        return service.triggered(warehouseId);
    }
}
