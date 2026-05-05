package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.PosSettingDto;
import io.smartpos.sales.application.PosSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pos-settings")
@RequiredArgsConstructor
public class PosSettingController {

    private final PosSettingService service;

    // ── GET ──────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('sale.view')")
    public ResponseEntity<PosSettingDto> get(@RequestParam UUID warehouseId) {
        return ResponseEntity.ok(service.get(warehouseId));
    }

    // ── PATCH (partial update) ────────────────────────────────────────────────

    @PatchMapping
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<PosSettingDto> patch(
        @RequestParam UUID warehouseId,
        @Valid @RequestBody PosSettingDto.UpdateRequest request) {
        return ResponseEntity.ok(service.update(warehouseId, request));
    }

    // ── PUT (full replacement — delegates to the same patch logic) ────────────

    @PutMapping
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<PosSettingDto> put(
        @RequestParam UUID warehouseId,
        @Valid @RequestBody PosSettingDto.UpdateRequest request) {
        return ResponseEntity.ok(service.update(warehouseId, request));
    }

    // ── POST /reset (restore factory defaults) ────────────────────────────────

    @PostMapping("/reset")
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<PosSettingDto> reset(@RequestParam UUID warehouseId) {
        return ResponseEntity.ok(service.reset(warehouseId));
    }
}
