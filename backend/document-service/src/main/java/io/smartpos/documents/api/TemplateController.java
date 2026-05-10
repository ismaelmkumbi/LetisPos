package io.smartpos.documents.api;

import io.smartpos.documents.application.TemplateService;
import io.smartpos.documents.application.TemplateService.TemplateInfo;
import io.smartpos.documents.domain.model.TemplateOverride;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TemplateInfo>> list() {
        return ResponseEntity.ok(templateService.listTemplates());
    }

    @GetMapping("/{documentType}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String documentType)
            throws Exception {
        String template = templateService.getResolvedTemplate(documentType);
        return ResponseEntity.ok(Map.of(
            "documentType", documentType,
            "bodyHtml", template
        ));
    }

    @PutMapping("/{documentType}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> saveOverride(
            @PathVariable String documentType,
            @RequestBody Map<String, String> body) {
        String bodyHtml = body.get("bodyHtml");
        String name = body.get("name");
        if (bodyHtml == null || bodyHtml.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "bodyHtml is required"));
        }
        TemplateOverride saved = templateService.saveOverride(documentType, bodyHtml, name);
        return ResponseEntity.ok(Map.of(
            "documentType", saved.getDocumentType(),
            "name", saved.getName(),
            "version", saved.getVersion()
        ));
    }

    @DeleteMapping("/{documentType}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> deleteOverride(
            @PathVariable String documentType) {
        templateService.deleteOverride(documentType);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/{documentType}/preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> preview(
            @PathVariable String documentType,
            @RequestBody Map<String, String> body) throws Exception {
        String bodyHtml = body.get("bodyHtml");
        if (bodyHtml == null || bodyHtml.isBlank()) {
            bodyHtml = templateService.getResolvedTemplate(documentType);
        }
        byte[] pdf = templateService.preview(documentType, bodyHtml);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
