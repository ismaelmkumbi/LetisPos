package io.smartpos.inventory.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.application.ReorderSuggestionService;
import io.smartpos.inventory.application.dto.ReorderSuggestion;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * AI-powered reorder suggestions based on sales velocity, stock levels,
 * and reorder rules.
 */
@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class ReorderSuggestionController {

    private final ReorderSuggestionService reorderSuggestionService;

    @GetMapping("/reorder-suggestions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReorderSuggestion>> getSuggestions(
            @RequestHeader(value = "X-Tenant-ID", required = false) UUID tenantId) {
        UUID resolvedTenantId = tenantId != null ? tenantId : TenantContext.get().orElse(null);
        return ResponseEntity.ok(reorderSuggestionService.generateSuggestions(resolvedTenantId));
    }
}
