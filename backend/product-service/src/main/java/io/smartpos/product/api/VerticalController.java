package io.smartpos.product.api;

import io.smartpos.product.application.TenantVerticalService;
import io.smartpos.product.application.VerticalRegistry;
import io.smartpos.product.domain.vertical.VerticalExtension;
import io.smartpos.product.domain.vertical.VerticalFieldDef;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * API endpoints for vertical extension modules.
 *
 * GET  /api/v1/verticals/{verticalKey}/fields   — field definitions for dynamic UI
 * GET  /api/v1/tenants/me/verticals              — active verticals for current tenant
 * POST /api/v1/tenants/me/verticals              — activate a vertical
 * DELETE /api/v1/tenants/me/verticals/{verticalKey} — deactivate a vertical
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class VerticalController {

    private final VerticalRegistry registry;
    private final TenantVerticalService tenantVerticalService;

    // ── Vertical field definitions ────────────────────────────────────────────

    /**
     * Returns field definitions for a specific vertical, enabling the frontend
     * to render dynamic product forms without hardcoding verticals.
     */
    @GetMapping("/api/v1/verticals/{verticalKey}/fields")
    @PreAuthorize("hasAuthority('product.view')")
    public ResponseEntity<Set<VerticalFieldDef>> getFieldDefinitions(
            @PathVariable String verticalKey) {

        return registry.get(verticalKey)
                .map(VerticalExtension::getFieldDefinitions)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Returns field definitions for ALL registered verticals, grouped by key.
     */
    @GetMapping("/api/v1/verticals/fields")
    @PreAuthorize("hasAuthority('product.view')")
    public Map<String, Set<VerticalFieldDef>> getAllFieldDefinitions() {
        return registry.allFieldDefinitions();
    }

    // ── Tenant vertical activation ────────────────────────────────────────────

    /**
     * Returns the set of vertical keys active for the current tenant.
     */
    @GetMapping("/api/v1/tenants/me/verticals")
    @PreAuthorize("hasAuthority('product.view')")
    public ResponseEntity<List<Map<String, Object>>> getMyVerticals() {
        List<Map<String, Object>> verticals = tenantVerticalService.getActiveVerticalsWithMeta();
        return ResponseEntity.ok(verticals);
    }

    /**
     * Activate a vertical for the current tenant.
     */
    @PostMapping("/api/v1/tenants/me/verticals")
    @PreAuthorize("hasAuthority('tenant.settings')")
    public ResponseEntity<?> activateVertical(@RequestBody Map<String, String> body) {
        String verticalKey = body.get("verticalKey");
        if (verticalKey == null || verticalKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "verticalKey is required"));
        }
        if (!registry.has(verticalKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown vertical: " + verticalKey));
        }
        boolean activated = tenantVerticalService.activate(verticalKey);
        if (activated) {
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "verticalKey", verticalKey,
                    "activated", true));
        }
        return ResponseEntity.ok(Map.of("verticalKey", verticalKey, "message", "Already active"));
    }

    /**
     * Deactivate a vertical for the current tenant.
     */
    @DeleteMapping("/api/v1/tenants/me/verticals/{verticalKey}")
    @PreAuthorize("hasAuthority('tenant.settings')")
    public ResponseEntity<?> deactivateVertical(@PathVariable String verticalKey) {
        boolean deactivated = tenantVerticalService.deactivate(verticalKey);
        if (deactivated) {
            return ResponseEntity.ok(Map.of("verticalKey", verticalKey, "deactivated", true));
        }
        return ResponseEntity.ok(Map.of("verticalKey", verticalKey, "message", "Was not active"));
    }
}
