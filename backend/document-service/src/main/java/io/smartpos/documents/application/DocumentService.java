package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
import io.smartpos.documents.infrastructure.storage.MinioObjectStore;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepo;
    private final TemplateResolver templateResolver;
    private final TemplateRenderer templateRenderer;
    private final GotenbergClient gotenbergClient;
    private final MinioObjectStore storage;

    private static final Map<String, String> TEMPLATE_FILES = Map.ofEntries(
        Map.entry("quotation", "quotation.hbs"),
        Map.entry("tax-invoice", "tax-invoice.hbs"),
        Map.entry("proforma-invoice", "proforma-invoice.hbs"),
        Map.entry("purchase-order", "purchase-order.hbs"),
        Map.entry("payment-receipt", "payment-receipt.hbs"),
        Map.entry("credit-note", "credit-note.hbs"),
        Map.entry("delivery-note", "delivery-note.hbs"),
        Map.entry("goods-received", "goods-received.hbs"),
        Map.entry("customer-statement", "customer-statement.hbs"),
        Map.entry("stock-transfer", "stock-transfer.hbs"),
        Map.entry("stock-count", "stock-count.hbs"),
        Map.entry("stock-adjustment", "stock-adjustment.hbs"),
        Map.entry("batch-traceability", "batch-traceability.hbs"),
        Map.entry("expiry-report", "expiry-report.hbs"),
        Map.entry("journal-voucher", "journal-voucher.hbs"),
        Map.entry("payment-voucher", "payment-voucher.hbs"),
        Map.entry("receipt-voucher", "receipt-voucher.hbs"),
        Map.entry("expense-voucher", "expense-voucher.hbs"),
        Map.entry("debit-note", "debit-note.hbs"),
        Map.entry("supplier-rfq", "supplier-rfq.hbs"),
        Map.entry("supplier-invoice", "supplier-invoice.hbs"),
        Map.entry("purchase-return", "purchase-return.hbs"),
        Map.entry("work-order", "work-order.hbs"),
        Map.entry("service-report", "service-report.hbs"),
        Map.entry("payslip", "payslip.hbs"),
        Map.entry("delivery-manifest", "delivery-manifest.hbs"),
        Map.entry("packing-slip", "packing-slip.hbs"),
        Map.entry("contract", "contract.hbs"),
        Map.entry("warranty-certificate", "warranty-certificate.hbs"),
        Map.entry("sales-return", "sales-return.hbs"),
        Map.entry("refund-receipt", "refund-receipt.hbs"),
        Map.entry("price-tag", "price-tag.hbs"),
        Map.entry("audit-report", "audit-report.hbs"),
        Map.entry("account-confirmation", "account-confirmation.hbs")
    );

    @Transactional
    public Document generate(String documentType, String referenceType, UUID referenceId,
                             Map<String, Object> contextData) throws Exception {
        UUID tenantId = TenantContext.require();

        String templateFile = TEMPLATE_FILES.get(documentType);
        if (templateFile == null) {
            throw new IllegalArgumentException("Unknown document type: " + documentType);
        }
        String templateContent = templateResolver.resolve(tenantId, documentType, templateFile);

        Map<String, Object> mergedContext = new java.util.HashMap<>(contextData);
        mergedContext.putIfAbsent("company", Map.of("name", "Letis POS"));
        mergedContext.put("qrData", buildQrData(documentType, referenceType, referenceId));
        String html = templateRenderer.render(templateContent, mergedContext);

        byte[] pdfBytes = gotenbergClient.convertHtmlToPdf(html);

        String docNumber = generateDocumentNumber(tenantId, documentType);

        String objectKey = "documents/" + tenantId + "/" + documentType + "/" +
                docNumber.replaceAll("[^a-zA-Z0-9\\-]", "_") + ".pdf";
        storage.upload(objectKey, pdfBytes, "application/pdf");

        Document doc = Document.builder()
                .tenantId(tenantId)
                .documentType(documentType)
                .documentNumber(docNumber)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .status("draft")
                .storagePath(objectKey)
                .contentType("application/pdf")
                .sizeBytes((long) pdfBytes.length)
                .createdAt(Instant.now())
                .build();

        Document saved = documentRepo.save(doc);
        log.info("Generated document {} ({}) for tenant={}", docNumber, documentType, tenantId);
        return saved;
    }

    public String getPresignedUrl(Document doc) throws Exception {
        return storage.presignedGetUrl(doc.getStoragePath());
    }

    private String generateDocumentNumber(UUID tenantId, String documentType) {
        String prefix = documentType.substring(0, 3).toUpperCase().replaceAll("[^A-Z]", "X");
        long count = documentRepo.count();
        return prefix + "-" + String.format("%06d", count + 1);
    }

    private String buildQrData(String documentType, String referenceType, UUID referenceId) {
        return switch (documentType) {
            case "tax-invoice", "proforma-invoice" ->
                "https://letispos.com/verify/" + referenceType + "/" + referenceId;
            case "payment-receipt" ->
                "https://pay.letispos.com/" + referenceType + "/" + referenceId;
            default -> "";
        };
    }
}
