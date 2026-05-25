package io.smartpos.sales.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.DocumentThemeDto;
import io.smartpos.sales.application.DocumentThemeService;
import io.smartpos.sales.application.MockDocumentPreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/document-themes")
@RequiredArgsConstructor
public class DocumentThemeController {

    private final DocumentThemeService service;
    private final MockDocumentPreviewService previewService;

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

    /**
     * Render a sample invoice / receipt / quotation using the tenant's
     * current brand profile + synthetic sale data. Lets a new tenant see
     * exactly what their printed documents will look like before they
     * have any real sales.
     */
    @PostMapping("/preview-mock")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> previewMock(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> req = body != null ? body : Map.of();
        String docType = (String) req.getOrDefault("documentType", "tax-invoice");
        String sampleStyle = (String) req.getOrDefault("sampleStyle", "typical");
        return ResponseEntity.ok(previewService.preview(docType, sampleStyle));
    }
}
