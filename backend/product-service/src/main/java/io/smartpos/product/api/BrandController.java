package io.smartpos.product.api;

import io.smartpos.product.api.dto.BrandDto;
import io.smartpos.product.application.BrandService;
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
@RequestMapping("/api/v1/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public List<BrandDto> list() { return service.list(); }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('product.view')")
    public Page<BrandDto> search(@RequestParam(required = false) String search, Pageable pageable) {
        return service.search(search, pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('category.manage')")
    public ResponseEntity<BrandDto> create(@Valid @RequestBody BrandDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('category.manage')")
    public BrandDto update(@PathVariable UUID id, @Valid @RequestBody BrandDto.CreateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('category.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
