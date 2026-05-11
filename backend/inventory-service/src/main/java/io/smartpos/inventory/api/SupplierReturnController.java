package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.SupplierReturnDto;
import io.smartpos.inventory.application.SupplierReturnService;
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
@RequestMapping("/api/v1/supplier-returns")
@RequiredArgsConstructor
public class SupplierReturnController {

    private final SupplierReturnService service;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.view')")
    public Page<SupplierReturnDto> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.view')")
    public SupplierReturnDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.count')")
    public ResponseEntity<SupplierReturnDto> create(@Valid @RequestBody SupplierReturnDto.CreateSupplierReturnRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAuthority('stock.count')")
    public SupplierReturnDto post(@PathVariable UUID id,
                                  @AuthenticationPrincipal Jwt jwt) {
        return service.post(id, jwt == null ? null : UUID.fromString(jwt.getSubject()));
    }
}
