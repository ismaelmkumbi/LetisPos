package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.BrandProfileDto;
import io.smartpos.sales.application.BrandProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

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

    // ── Inheritance ────────────────────────────────────────────────────────

    @PostMapping("/profile/link/{parentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> linkToParent(@PathVariable UUID parentId) {
        return ResponseEntity.ok(service.linkToParent(parentId));
    }

    @PostMapping("/profile/unlink")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> unlink() {
        return ResponseEntity.ok(service.unlink());
    }

    // ── Custom Domain ───────────────────────────────────────────────────────

    @PostMapping("/domain/request")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> requestDomain(@RequestBody Map<String, String> body) {
        String domain = body.get("domain");
        if (domain == null || domain.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(service.requestDomain(domain));
    }

    @GetMapping("/domain/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> getDomainStatus() {
        return ResponseEntity.ok(service.getDomainStatus());
    }

    @PostMapping("/domain/verify")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> verifyDomain() {
        return ResponseEntity.ok(service.verifyDomain());
    }

    @PostMapping("/domain/remove")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> removeDomain() {
        return ResponseEntity.ok(service.removeDomain());
    }

    // ── Approval workflow (V28) ──────────────────────────────────────────

    @PostMapping("/profile/submit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> submitForReview() {
        return ResponseEntity.ok(service.submitForReview());
    }

    @PostMapping("/profile/approve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> approve() {
        return ResponseEntity.ok(service.approve());
    }

    @PostMapping("/profile/reject")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> reject() {
        return ResponseEntity.ok(service.reject());
    }

    @PostMapping("/profile/archive")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> archive() {
        return ResponseEntity.ok(service.archive());
    }

    // ── Version history (V26) ────────────────────────────────────────────

    @GetMapping("/profile/versions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getVersions() {
        return ResponseEntity.ok(service.getVersionHistory());
    }

    // ── Export / Import ──────────────────────────────────────────────────

    @PostMapping("/profile/export")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> exportConfig() {
        return ResponseEntity.ok(service.exportConfig());
    }

    @PostMapping("/profile/import")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandProfileDto> importConfig(
            @RequestBody Map<String, Object> config) {
        return ResponseEntity.ok(service.importConfig(config));
    }
}
