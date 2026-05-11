package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.AdjustmentDto;
import io.smartpos.inventory.api.dto.CreateDamageRequest;
import io.smartpos.inventory.api.dto.DamageRejectRequest;
import io.smartpos.inventory.application.AdjustmentService;
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

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/adjustments")
@RequiredArgsConstructor
public class AdjustmentController {

    private final AdjustmentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.adjust') or hasAuthority('stock.view')")
    public Page<AdjustmentDto> search(@RequestParam(required = false) UUID warehouseId,
                                      @RequestParam(required = false) LocalDate dateFrom,
                                      @RequestParam(required = false) LocalDate dateTo,
                                      Pageable pageable) {
        return service.search(warehouseId, dateFrom, dateTo, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.adjust') or hasAuthority('stock.view')")
    public AdjustmentDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.adjust')")
    public ResponseEntity<AdjustmentDto> create(@Valid @RequestBody AdjustmentDto.CreateRequest req,
                                                @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }

    // ---- Damage & Waste ----

    @PostMapping("/damage")
    @PreAuthorize("hasAuthority('stock.adjust')")
    public ResponseEntity<AdjustmentDto> recordDamage(@Valid @RequestBody CreateDamageRequest req,
                                                      @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.recordDamage(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }

    @PostMapping("/damage/{id}/approve")
    @PreAuthorize("hasAuthority('stock.count')")
    public AdjustmentDto approveDamage(@PathVariable UUID id,
                                       @AuthenticationPrincipal Jwt jwt) {
        return service.approveDamage(id, jwt == null ? null : UUID.fromString(jwt.getSubject()));
    }

    @PostMapping("/damage/{id}/reject")
    @PreAuthorize("hasAuthority('stock.count')")
    public AdjustmentDto rejectDamage(@PathVariable UUID id,
                                      @Valid @RequestBody DamageRejectRequest req) {
        return service.rejectDamage(id, req.reason());
    }
}
