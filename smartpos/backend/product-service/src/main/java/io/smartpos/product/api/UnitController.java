package io.smartpos.product.api;

import io.smartpos.product.api.dto.UnitDto;
import io.smartpos.product.application.UnitService;
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
@RequestMapping("/api/v1/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public List<UnitDto> list() { return service.list(); }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('product.view')")
    public Page<UnitDto> search(@RequestParam(required = false) String search, Pageable pageable) {
        return service.search(search, pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('category.manage')")
    public ResponseEntity<UnitDto> create(@Valid @RequestBody UnitDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('category.manage')")
    public UnitDto update(@PathVariable UUID id, @Valid @RequestBody UnitDto.CreateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('category.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
