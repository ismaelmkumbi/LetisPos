package io.smartpos.documents.api;

import io.smartpos.documents.api.dto.*;
import io.smartpos.documents.application.BulkGenerationService;
import io.smartpos.documents.application.DeliveryService;
import io.smartpos.documents.application.DocumentService;
import io.smartpos.documents.application.VfdService;
import io.smartpos.documents.domain.model.BulkJob;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.model.DocumentVersion;
import io.smartpos.documents.domain.repository.BulkJobRepository;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.domain.repository.DocumentVersionRepository;
import io.smartpos.documents.infrastructure.feign.AiServiceClient;
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import io.smartpos.common.context.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final DeliveryService deliveryService;
    private final DocumentRepository documentRepo;
    private final DocumentVersionRepository versionRepo;
    private final BulkGenerationService bulkService;
    private final BulkJobRepository bulkJobRepo;
    private final AiServiceClient aiClient;
    private final VfdService vfdService;
    private final TemplateResolver templateResolver;
    private final TemplateRenderer templateRenderer;
    private final GotenbergClient gotenbergClient;

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

    @PostMapping("/preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> preview(@Valid @RequestBody GenerateDocumentRequest req) throws Exception {
        UUID tenantId = TenantContext.require();
        String templateFile = documentService.getTemplateFile(req.getDocumentType());
        if (templateFile == null) {
            throw new IllegalArgumentException("Unknown document type: " + req.getDocumentType());
        }
        String templateContent = templateResolver.resolve(tenantId, req.getDocumentType(), templateFile);
        Map<String, Object> context = new java.util.HashMap<>(
            req.getContextData() != null ? req.getContextData() : Map.of());
        context.putIfAbsent("company", Map.of("name", "Letis POS"));
        if (req.getReferenceType() != null && req.getReferenceId() != null) {
            try {
                context.putAll(documentService.fetchReferenceData(
                    req.getReferenceType(), req.getReferenceId()));
            } catch (Exception e) {
                /* preview without reference data */
            }
        }
        String html = templateRenderer.render(templateContent, context);
        byte[] pdf = gotenbergClient.convertHtmlToPdf(html);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(pdf);
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

    @PostMapping("/bulk")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BulkJobDto> bulkGenerate(@Valid @RequestBody BulkGenerateRequest req) {
        UUID tenantId = TenantContext.require();
        BulkJob job = BulkJob.builder()
                .tenantId(tenantId)
                .documentType(req.getDocumentType())
                .referenceType(req.getReferenceType())
                .status("pending")
                .total(req.getReferenceIds().size())
                .build();
        job = bulkJobRepo.save(job);
        bulkService.process(job, req.getReferenceIds());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(BulkJobDto.from(job));
    }

    @GetMapping("/bulk/{jobId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BulkJobDto> bulkJobStatus(@PathVariable UUID jobId) {
        BulkJob job = bulkJobRepo.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        return ResponseEntity.ok(BulkJobDto.from(job));
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<DocumentDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String referenceType,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) throws Exception {
        UUID tenantId = TenantContext.require();
        String[] sortParts = sort.split(",");
        Sort.Direction dir = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")
            ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));

        Instant from = dateFrom != null ? Instant.parse(dateFrom) : null;
        Instant to = dateTo != null ? Instant.parse(dateTo) : null;

        Page<Document> docs = documentRepo.search(tenantId, q, documentType, status,
            referenceType, from, to, pageable);
        return ResponseEntity.ok(docs.map(d -> DocumentDto.from(d, null)));
    }

    @GetMapping("/bulk/{jobId}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> bulkJobDownload(@PathVariable UUID jobId) throws Exception {
        BulkJob job = bulkJobRepo.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        if (!"completed".equals(job.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(null);
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = new ObjectMapper().readValue(job.getResultsJson(), List.class);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (var r : results) {
                if (!"success".equals(r.get("status"))) continue;
                UUID docId = UUID.fromString((String) r.get("documentId"));
                var doc = documentRepo.findById(docId).orElse(null);
                if (doc == null) continue;
                byte[] pdfBytes = documentService.downloadPdf(doc);
                ZipEntry entry = new ZipEntry((String) r.get("documentNumber") + ".pdf");
                zos.putNextEntry(entry);
                zos.write(pdfBytes);
                zos.closeEntry();
            }
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"documents.zip\"")
                .body(baos.toByteArray());
    }

    @PostMapping("/{id}/summarize")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> summarize(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
            .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        Map<String, Object> req = Map.of(
            "facts", Map.of(
                "documentType", doc.getDocumentType(),
                "documentNumber", doc.getDocumentNumber(),
                "referenceType", doc.getReferenceType()
            ),
            "instruction", "Summarize this document in 2-3 sentences for a business audience."
        );
        Map<String, Object> result = aiClient.narrate(req);
        String summary = (String) result.getOrDefault("narrative", "");
        doc.setSummary(summary);
        documentRepo.save(doc);
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @PostMapping("/field-map")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> fieldMap(@RequestBody Map<String, Object> body) throws Exception {
        @SuppressWarnings("unchecked")
        List<String> headers = (List<String>) body.get("headers");
        String documentType = (String) body.getOrDefault("documentType", "generic");
        Map<String, Object> req = Map.of(
            "prompt", "Map these CSV headers to document template fields for a " + documentType
                + ". Headers: " + String.join(", ", headers)
                + ". Return JSON: {\"mappings\": {\"templateField\": \"headerName\", ...}, \"confidence\": 0.0-1.0}",
            "responseFormat", "json"
        );
        return ResponseEntity.ok(aiClient.chat(req));
    }

    @PostMapping("/{id}/anomalies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> anomalies(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
            .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        Map<String, Object> req = Map.of(
            "data", Map.of(
                "documentNumber", doc.getDocumentNumber(),
                "documentType", doc.getDocumentType(),
                "status", doc.getStatus(),
                "createdAt", doc.getCreatedAt().toString()
            )
        );
        return ResponseEntity.ok(aiClient.detectAnomalies(req));
    }

    @PostMapping("/{id}/vfd/retry")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> retryVfd(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
            .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        vfdService.submitToVfd(doc, Map.of());
        return ResponseEntity.ok(Map.of("status", doc.getVfdStatus()));
    }
}
