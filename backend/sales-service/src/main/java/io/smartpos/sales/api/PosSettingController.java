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

    @GetMapping
    @PreAuthorize("hasAuthority('sale.view')")
    public ResponseEntity<PosSettingDto> get(@RequestParam UUID warehouseId) {
        return ResponseEntity.ok(service.get(warehouseId));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<PosSettingDto> update(
        @RequestParam UUID warehouseId,
        @Valid @RequestBody PosSettingDto.UpdateRequest request) {
        return ResponseEntity.ok(service.update(warehouseId, request));
    }
}
