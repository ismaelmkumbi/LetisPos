package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.BrandProfileDto;
import io.smartpos.sales.application.BrandProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/brand")
@RequiredArgsConstructor
public class BrandController {

    private final BrandProfileService service;

    // ── Profile ─────────────────────────────────────────────────────────────

    @GetMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> get() {
        return ResponseEntity.ok(service.get());
    }

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> update(
            @Valid @RequestBody BrandProfileDto.UpdateRequest request) {
        return ResponseEntity.ok(service.update(request));
    }

    @PostMapping("/profile/reset")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> reset() {
        return ResponseEntity.ok(service.reset());
    }
}
