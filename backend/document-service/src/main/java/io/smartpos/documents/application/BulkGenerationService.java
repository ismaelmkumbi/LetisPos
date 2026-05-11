package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.BulkJob;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.BulkJobRepository;
import io.smartpos.documents.domain.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class BulkGenerationService {

    private final BulkJobRepository jobRepo;
    private final DocumentService documentService;
    private final DocumentRepository documentRepo;
    private final DeliveryService deliveryService;

    private static final ObjectMapper mapper = new ObjectMapper();

    @Async("bulkGenerationExecutor")
    @Transactional
    public CompletableFuture<Void> process(BulkJob job, List<UUID> referenceIds) {
        UUID tenantId = job.getTenantId();
        TenantContext.set(tenantId);
        List<Map<String, Object>> results = new ArrayList<>();
        try {
            job.setStatus("running");
            job.setTotal(referenceIds.size());
            jobRepo.save(job);

            for (int i = 0; i < referenceIds.size(); i++) {
                try {
                    var doc = documentService.generate(job.getDocumentType(), job.getReferenceType(),
                            referenceIds.get(i), Map.of());
                    results.add(Map.of(
                            "referenceId", referenceIds.get(i).toString(),
                            "documentId", doc.getId().toString(),
                            "documentNumber", doc.getDocumentNumber(),
                            "status", "success"));
                } catch (Exception e) {
                    log.error("Failed to generate doc for reference {}", referenceIds.get(i), e);
                    results.add(Map.of(
                            "referenceId", referenceIds.get(i).toString(),
                            "status", "failed",
                            "error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
                }
                job.setProgress(i + 1);
                job.setResultsJson(mapper.writeValueAsString(results));
                jobRepo.save(job);
            }
            job.setStatus("completed");

            // Post-generation delivery
            if (job.getDeliveryChannel() != null && !job.getDeliveryChannel().isEmpty()) {
                for (var r : results) {
                    if (!"success".equals(r.get("status"))) continue;
                    UUID docId = UUID.fromString((String) r.get("documentId"));
                    var doc = documentRepo.findById(docId).orElse(null);
                    if (doc == null) continue;
                    try {
                        if ("email".equals(job.getDeliveryChannel())) {
                            deliveryService.sendEmail(doc, job.getDeliveryRecipient(),
                                "Document: " + doc.getDocumentNumber(), "");
                        } else if ("whatsapp".equals(job.getDeliveryChannel())) {
                            deliveryService.sendWhatsApp(doc, job.getDeliveryRecipient(),
                                "Document: " + doc.getDocumentNumber());
                        }
                    } catch (Exception e) {
                        log.warn("Delivery failed for {}: {}", doc.getDocumentNumber(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Bulk gen failed for job {}", job.getId(), e);
            job.setStatus("failed");
        }
        jobRepo.save(job);
        TenantContext.clear();
        return CompletableFuture.completedFuture(null);
    }
}
