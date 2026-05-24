package io.smartpos.sales.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.DocumentThemeDto;
import io.smartpos.sales.application.DocumentThemeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/document-themes")
@RequiredArgsConstructor
public class DocumentThemeController {

    private final DocumentThemeService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DocumentThemeDto>> list() {
        UUID tenantId = TenantContext.require();
        return ResponseEntity.ok(service.list(tenantId));
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DocumentThemeDto>> saveAll(@RequestBody List<DocumentThemeDto> themes) {
        UUID tenantId = TenantContext.require();
        return ResponseEntity.ok(service.saveAll(tenantId, themes));
    }

    @PostMapping("/reset")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> reset() {
        UUID tenantId = TenantContext.require();
        service.resetAll(tenantId);
        return ResponseEntity.ok().build();
    }
}
