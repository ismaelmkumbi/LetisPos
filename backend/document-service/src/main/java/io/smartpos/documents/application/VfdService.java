package io.smartpos.documents.application;

import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.infrastructure.feign.VfdClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j @Service @RequiredArgsConstructor
public class VfdService {
    private final VfdClient vfdClient;
    private final DocumentRepository documentRepo;

    @Value("${smartpos.tra.seller-tin:123-456-789}") private String sellerTin;
    @Value("${smartpos.tra.vat-registration:VAT-123456}") private String vatReg;

    public void submitToVfd(Document doc, Map<String, Object> invoiceData) {
        try {
            Map<String, Object> req = Map.of(
                "sellerTin", sellerTin,
                "buyerTin", invoiceData.getOrDefault("buyerTin", ""),
                "invoiceNumber", doc.getDocumentNumber(),
                "invoiceDate", doc.getCreatedAt().toString(),
                "totalAmount", invoiceData.getOrDefault("grandTotal", "0"),
                "vatAmount", invoiceData.getOrDefault("taxAmount", "0"),
                "vatRegistration", vatReg
            );
            Map<String, Object> response = vfdClient.registerInvoice(req);
            doc.setFiscalCode((String) response.getOrDefault("fiscalCode", ""));
            doc.setZNumber((String) response.getOrDefault("zNumber", ""));
            doc.setReceiptNumber((String) response.getOrDefault("receiptNumber", ""));
            doc.setVfdStatus("registered");
            doc.setVfdSubmittedAt(Instant.now());
            doc.setVfdResponse(response.toString());
            documentRepo.save(doc);
            log.info("VFD registered: doc={} fiscal={}", doc.getDocumentNumber(), doc.getFiscalCode());
        } catch (Exception e) {
            log.error("VFD submission failed for doc={}: {}", doc.getDocumentNumber(), e.getMessage());
            doc.setVfdStatus("failed");
            doc.setVfdResponse("{\"error\":\"" + e.getMessage() + "\"}");
            documentRepo.save(doc);
        }
    }

    @Scheduled(fixedDelayString = "${smartpos.tra.retry-backoff-seconds:60}000")
    public void retryFailed() {
        List<Document> failed = documentRepo.findByDocumentTypeAndVfdStatus("tax-invoice", "failed");
        if (failed.isEmpty()) return;
        log.info("Retrying {} failed VFD submissions", failed.size());
        failed.forEach(doc -> submitToVfd(doc, Map.of()));
    }

    public String getSellerTin() { return sellerTin; }
}
