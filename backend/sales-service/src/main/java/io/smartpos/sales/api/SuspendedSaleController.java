package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.SuspendedSaleDto;
import io.smartpos.sales.application.SuspendedSaleService;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
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
@RequestMapping("/api/v1/suspended-sales")
@RequiredArgsConstructor
public class SuspendedSaleController {

    private final SuspendedSaleService service;

    @GetMapping
    @PreAuthorize("hasAuthority('sale.view')")
    public Page<SuspendedSaleDto> search(@RequestParam(required = false) String search,
                                          @RequestParam(required = false) SuspendedSaleStatus status,
                                          Pageable pageable) {
        return service.search(search, status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('sale.view')")
    public SuspendedSaleDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('pos.checkout')")
    public ResponseEntity<SuspendedSaleDto> create(@Valid @RequestBody SuspendedSaleDto.CreateRequest req,
                                                    @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, userIdFrom(jwt)));
    }

    @PostMapping("/{id}/resume")
    @PreAuthorize("hasAuthority('pos.checkout')")
    public SuspendedSaleDto resume(@PathVariable UUID id) {
        return service.resume(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('sale.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    @DeleteMapping("/expired")
    @PreAuthorize("hasAuthority('sale.delete')")
    public ResponseEntity<String> purgeExpired() {
        int count = service.purgeExpired();
        return ResponseEntity.ok("Purged " + count + " expired holds");
    }

    private static UUID userIdFrom(Jwt jwt) {
        return jwt == null ? null : UUID.fromString(jwt.getSubject());
    }
}
