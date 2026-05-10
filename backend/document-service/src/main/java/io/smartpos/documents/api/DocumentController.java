package io.smartpos.documents.api;

import io.smartpos.documents.api.dto.*;
import io.smartpos.documents.application.DeliveryService;
import io.smartpos.documents.application.DocumentService;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.model.DocumentVersion;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.domain.repository.DocumentVersionRepository;
import io.smartpos.common.context.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final DeliveryService deliveryService;
    private final DocumentRepository documentRepo;
    private final DocumentVersionRepository versionRepo;

    @PostMapping("/generate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentDto> generate(@Valid @RequestBody GenerateDocumentRequest req)
            throws Exception {
        Document doc = documentService.generate(
                req.getDocumentType(),
                req.getReferenceType(),
                req.getReferenceId(),
                req.getContextData() != null ? req.getContextData() : Map.of());
        String url = documentService.getPresignedUrl(doc);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentDto.from(doc, url));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentDto> get(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        String url = documentService.getPresignedUrl(doc);
        return ResponseEntity.ok(DocumentDto.from(doc, url));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> downloadPdf(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        String url = documentService.getPresignedUrl(doc);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, url)
                .build();
    }

    @PostMapping("/{id}/email")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> email(@PathVariable UUID id,
                                                      @Valid @RequestBody EmailRequest req)
            throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        deliveryService.sendEmail(doc, req.getTo(), req.getSubject(),
                req.getMessage() != null ? req.getMessage() : "");
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/{id}/whatsapp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> whatsapp(@PathVariable UUID id,
                                                         @Valid @RequestBody WhatsAppRequest req)
            throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        deliveryService.sendWhatsApp(doc, req.getPhone(),
                req.getMessage() != null ? req.getMessage() : "");
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<DocumentDto>> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) UUID referenceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) throws Exception {
        UUID tenantId = TenantContext.require();
        Page<Document> docs;
        if (type != null) {
            docs = documentRepo.findByTenantIdAndDocumentType(tenantId, type,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        } else {
            docs = documentRepo.findByTenantId(tenantId,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        }
        return ResponseEntity.ok(docs.map(d -> DocumentDto.from(d, null)));
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DocumentVersion>> listVersions(@PathVariable UUID id) {
        return ResponseEntity.ok(versionRepo.findByDocumentIdOrderByVersionNumberDesc(id));
    }

    @GetMapping("/{id}/versions/{versionId}/pdf")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadVersionPdf(@PathVariable UUID id, @PathVariable UUID versionId) throws Exception {
        DocumentVersion version = versionRepo.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Version not found: " + versionId));
        byte[] pdfBytes = documentService.downloadByPath(version.getStoragePath());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(pdfBytes);
    }
}
