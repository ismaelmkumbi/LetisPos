package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.model.DocumentVersion;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.domain.repository.DocumentVersionRepository;
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
import io.smartpos.documents.infrastructure.storage.MinioObjectStore;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepo;
    private final DocumentVersionRepository versionRepo;
    private final TemplateResolver templateResolver;
    private final TemplateRenderer templateRenderer;
    private final GotenbergClient gotenbergClient;
    private final MinioObjectStore storage;
    private final VfdService vfdService;
    private final io.smartpos.documents.infrastructure.feign.SalesClient salesClient;
    private final io.smartpos.documents.infrastructure.feign.PurchaseClient purchaseClient;
    private final io.smartpos.documents.infrastructure.feign.PaymentClient paymentClient;
    private final io.smartpos.documents.infrastructure.feign.PosSettingClient posSettingClient;

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
        Map.entry("account-confirmation", "account-confirmation.hbs"),
        Map.entry("report-sales", "report-sales.hbs"),
        Map.entry("report-financial", "report-financial.hbs"),
        Map.entry("report-customer", "report-customer.hbs"),
        Map.entry("report-employee", "report-employee.hbs"),
        Map.entry("report-inventory", "report-inventory.hbs"),
        Map.entry("report-supplier", "report-supplier.hbs"),
        Map.entry("report-tax", "report-tax.hbs"),
        Map.entry("report-operations", "report-operations.hbs")
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

        // Fetch real transaction data if reference provided (must run before company
        // context so we have warehouseId for branding lookup).
        if (referenceType != null && referenceId != null) {
            try {
                Map<String, Object> realData = fetchReferenceData(referenceType, referenceId);
                mergedContext.putAll(realData);
            } catch (Exception e) {
                log.warn("Could not fetch {} data for {}: {}", referenceType, referenceId, e.getMessage());
            }
        }

        // Enrich company context from PosSetting (or use client override if provided).
        if (!mergedContext.containsKey("company")) {
            mergedContext.put("company", resolveCompanyContext(mergedContext));
        }

        mergedContext.put("qrData", buildQrData(documentType, referenceType, referenceId));
        if ("tax-invoice".equals(documentType)) {
            mergedContext.put("sellerTin", vfdService.getSellerTin());
        }
        mergedContext.put("watermark", "DRAFT");
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
                .watermark("DRAFT")
                .storagePath(objectKey)
                .contentType("application/pdf")
                .sizeBytes((long) pdfBytes.length)
                .createdAt(Instant.now())
                .build();

        Document saved = documentRepo.save(doc);

        DocumentVersion v1 = DocumentVersion.builder()
                .documentId(saved.getId())
                .versionNumber(1)
                .storagePath(saved.getStoragePath())
                .changeType("created")
                .changeSummary("Document generated")
                .build();
        versionRepo.save(v1);

        if ("tax-invoice".equals(documentType)) {
            vfdService.submitToVfd(saved, mergedContext);
        }

        log.info("Generated document {} ({}) for tenant={}", docNumber, documentType, tenantId);
        return saved;
    }

    public String getPresignedUrl(Document doc) throws Exception {
        return storage.presignedGetUrl(doc.getStoragePath());
    }

    public byte[] downloadByPath(String storagePath) throws Exception {
        return storage.download(storagePath);
    }

    public byte[] downloadPdf(Document doc) throws Exception {
        return storage.download(doc.getStoragePath());
    }

    public DocumentVersion createVersion(Document doc, String changeType, String summary) {
        int nextVersion = versionRepo.countByDocumentId(doc.getId()) + 1;
        DocumentVersion version = DocumentVersion.builder()
                .documentId(doc.getId())
                .versionNumber(nextVersion)
                .storagePath(doc.getStoragePath())
                .changeType(changeType)
                .changeSummary(summary)
                .build();
        return versionRepo.save(version);
    }

    private String generateDocumentNumber(UUID tenantId, String documentType) {
        String prefix = documentType.substring(0, 3).toUpperCase().replaceAll("[^A-Z]", "X");
        long count = documentRepo.countByTenantId(tenantId);
        return prefix + "-" + String.format("%06d", count + 1);
    }

    public String getTemplateFile(String documentType) {
        return TEMPLATE_FILES.get(documentType);
    }

    @Scheduled(cron = "0 0 2 * * *") // 2am daily
    @Transactional
    public void expireQuotations() {
        Instant expiryThreshold = Instant.now().minus(30, ChronoUnit.DAYS);
        int expired = 0;

        // Find draft/sent quotations older than threshold
        Page<Document> page = documentRepo.findByDocumentTypeAndStatusAndCreatedAtBefore(
            "quotation", "draft", expiryThreshold, Pageable.ofSize(100));

        for (Document doc : page) {
            doc.setStatus("expired");
            doc.setWatermark("EXPIRED");
            documentRepo.save(doc);
            createVersion(doc, "status_change", "Quotation expired automatically");
            expired++;
        }

        // Also expire "sent" quotations
        page = documentRepo.findByDocumentTypeAndStatusAndCreatedAtBefore(
            "quotation", "sent", expiryThreshold, Pageable.ofSize(100));
        for (Document doc : page) {
            doc.setStatus("expired");
            doc.setWatermark("EXPIRED");
            documentRepo.save(doc);
            createVersion(doc, "status_change", "Quotation expired automatically");
            expired++;
        }

        if (expired > 0) log.info("Expired {} quotations", expired);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchReferenceData(String referenceType, UUID referenceId) {
        try {
            Map<String, Object> raw = switch (referenceType) {
                case "sale" -> salesClient.getSale(referenceId);
                case "purchase" -> purchaseClient.getPurchase(referenceId);
                case "payment" -> paymentClient.getPayment(referenceId);
                default -> Map.of();
            };

            // Map common fields to template placeholders
            Map<String, Object> mapped = new java.util.HashMap<>();
            mapped.put("document", Map.of(
                "number", raw.getOrDefault("ref", raw.getOrDefault("reference", "")),
                "date", raw.getOrDefault("date", raw.getOrDefault("createdAt", "")),
                "status", raw.getOrDefault("status", "draft")
            ));

            if (raw.containsKey("customer") && raw.get("customer") instanceof Map) {
                mapped.put("customer", raw.get("customer"));
            } else if (raw.containsKey("customerName")) {
                mapped.put("customer", Map.of("name", raw.getOrDefault("customerName", "")));
            }

            if (raw.containsKey("supplier") && raw.get("supplier") instanceof Map) {
                mapped.put("supplier", raw.get("supplier"));
            }

            if (raw.containsKey("lines") || raw.containsKey("items")) {
                mapped.put("items", raw.getOrDefault("lines", raw.get("items")));
            }

            if (raw.containsKey("grandTotal")) {
                mapped.put("totals", Map.of(
                    "subtotal", raw.getOrDefault("subtotal", raw.getOrDefault("total", 0)),
                    "tax", raw.getOrDefault("taxAmount", raw.getOrDefault("tax", 0)),
                    "discount", raw.getOrDefault("discountAmount", 0),
                    "grandTotal", raw.get("grandTotal")
                ));
            }

            mapped.put("preparedBy", Map.of("name", raw.getOrDefault("sellerName",
                raw.getOrDefault("createdBy", "System"))));

            // Pass through warehouseId for branding lookup
            if (raw.containsKey("warehouseId") && raw.get("warehouseId") != null) {
                mapped.put("warehouseId", raw.get("warehouseId"));
            }

            log.debug("Fetched {} data for id={}: {} fields", referenceType, referenceId, mapped.size());
            return mapped;
        } catch (Exception e) {
            log.warn("Failed to fetch {} data for {}: {}", referenceType, referenceId, e.getMessage());
            return Map.of();
        }
    }

    /**
     * Builds the company context map for template rendering.
     * Resolves PosSetting using warehouseId from reference data or contextData.
     * Falls back to "Letis POS" default if PosSetting is unavailable.
     */
    private Map<String, Object> resolveCompanyContext(Map<String, Object> mergedContext) {
        UUID warehouseId = null;
        try {
            Object wid = mergedContext.get("warehouseId");
            if (wid instanceof UUID w) {
                warehouseId = w;
            } else if (wid instanceof String s) {
                warehouseId = UUID.fromString(s);
            }
        } catch (Exception e) {
            log.debug("No warehouseId in context for branding lookup");
        }

        if (warehouseId != null) {
            try {
                var branding = posSettingClient.get(warehouseId);
                return Map.of(
                    "name", branding.storeName() != null && !branding.storeName().isBlank()
                        ? branding.storeName() : "Letis POS",
                    "logoUrl", branding.logoUrl() != null ? branding.logoUrl() : "",
                    "address", branding.showStoreAddress() && branding.storeAddress() != null
                        ? branding.storeAddress() : "",
                    "phone", branding.showStorePhone() && branding.storePhone() != null
                        ? branding.storePhone() : "",
                    "email", branding.showStoreEmail() && branding.storeEmail() != null
                        ? branding.storeEmail() : "",
                    "tin", branding.storeTaxId() != null ? branding.storeTaxId() : "",
                    "website", branding.storeWebsite() != null ? branding.storeWebsite() : "",
                    "showLogo", branding.showLogo() && branding.logoUrl() != null
                        && !branding.logoUrl().isBlank(),
                    "logoSize", branding.logoSize() > 0 ? branding.logoSize() : 60
                );
            } catch (Exception e) {
                log.warn("Failed to fetch PosSetting for warehouse {}: {}", warehouseId, e.getMessage());
            }
        }

        return Map.of("name", "Letis POS");
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
