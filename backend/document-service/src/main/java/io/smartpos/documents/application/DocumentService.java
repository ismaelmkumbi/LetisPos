package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.model.DocumentVersion;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.domain.repository.DocumentVersionRepository;
import io.smartpos.documents.domain.repository.I18nLabelRepository;
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

import java.io.InputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
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
    private final io.smartpos.documents.infrastructure.feign.CustomerClient customerClient;
    private final io.smartpos.documents.infrastructure.feign.ProductClient productClient;
    private final I18nLabelRepository i18nRepo;

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
            String locale = contextData != null ? String.valueOf(contextData.getOrDefault("locale", "en")) : "en";
            mergedContext.put("i18n", loadI18nLabels(locale, tenantId));
        }

        mergedContext.put("qrData", buildQrData(documentType, referenceType, referenceId));
        if ("tax-invoice".equals(documentType)) {
            mergedContext.put("sellerTin", vfdService.getSellerTin());
        }
        mergedContext.put("watermark", "DRAFT");
        String html = templateRenderer.render(templateContent, mergedContext);

        byte[] pdfBytes = gotenbergClient.convertHtmlToPdf(html,
                String.valueOf(mergedContext.getOrDefault("paperWidth", "8.27")),
                String.valueOf(mergedContext.getOrDefault("paperHeight", "11.69")));

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
            } else if (raw.containsKey("customerName") && !raw.get("customerName").toString().isBlank()) {
                mapped.put("customer", Map.of("name", raw.get("customerName")));
            } else if (raw.containsKey("customerId") && raw.get("customerId") != null) {
                // Resolve customer name from product-service
                try {
                    UUID cid = raw.get("customerId") instanceof UUID uid
                        ? uid : UUID.fromString(raw.get("customerId").toString());
                    var customerData = customerClient.getCustomer(cid);
                    String cname = (String) customerData.getOrDefault("name", "Walk-in Customer");
                    mapped.put("customer", Map.of("name", cname));
                } catch (Exception e) {
                    mapped.put("customer", Map.of("name", "Walk-in Customer"));
                }
            }

            if (raw.containsKey("supplier") && raw.get("supplier") instanceof Map) {
                mapped.put("supplier", raw.get("supplier"));
            }

            if (raw.containsKey("lines") || raw.containsKey("items")) {
                @SuppressWarnings("unchecked")
                java.util.List<Map<String, Object>> rawItems =
                    (java.util.List<Map<String, Object>>) raw.getOrDefault("lines", raw.get("items"));
                java.util.List<Map<String, Object>> transformed = new java.util.ArrayList<>();
                // UUID pattern for detecting unresolved product names
                java.util.regex.Pattern uuidPattern = java.util.regex.Pattern.compile(
                    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
                for (Map<String, Object> item : rawItems) {
                    Map<String, Object> t = new java.util.HashMap<>(item);
                    // Map API field names to template field names
                    t.putIfAbsent("name", item.getOrDefault("productName", item.get("name")));
                    t.putIfAbsent("quantity", item.getOrDefault("qty", item.get("quantity")));
                    t.putIfAbsent("total", item.getOrDefault("lineTotal", item.get("total")));
                    t.putIfAbsent("unitPrice", item.getOrDefault("unitPrice", item.get("price")));
                    // Resolve UUID product names via product-service (dynamic, always fresh)
                    Object nameObj = t.get("name");
                    Object productIdObj = item.get("productId");
                    if (nameObj instanceof String name && uuidPattern.matcher(name).matches()
                        && productIdObj != null) {
                        try {
                            UUID pid = productIdObj instanceof UUID uid
                                ? uid : UUID.fromString(productIdObj.toString());
                            var product = productClient.getProduct(pid);
                            String resolvedName = (String) product.getOrDefault("name", name);
                            t.put("name", resolvedName);
                        } catch (Exception e) {
                            // Keep the UUID as fallback — better than nothing
                        }
                    }
                    transformed.add(t);
                }
                mapped.put("items", transformed);
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
    public Map<String, Object> resolveCompanyContext(Map<String, Object> mergedContext) {
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
                var b = posSettingClient.get(warehouseId);
                boolean hasCustomLogo = b.showLogo() && b.logoUrl() != null
                    && !b.logoUrl().isBlank();
                String primary = (b.primaryColor() != null && !b.primaryColor().isBlank())
                        ? b.primaryColor() : "#16A34A";
                java.util.HashMap<String, Object> ctx = new java.util.HashMap<>();
                ctx.put("name", b.storeName() != null && !b.storeName().isBlank()
                        ? b.storeName() : "Letis POS");
                ctx.put("logoUrl", hasCustomLogo ? b.logoUrl() : letisLogoDataUri());
                ctx.put("address", b.showStoreAddress() && b.storeAddress() != null
                        ? b.storeAddress() : "");
                ctx.put("phone", b.showStorePhone() && b.storePhone() != null
                        ? b.storePhone() : "");
                ctx.put("email", b.showStoreEmail() && b.storeEmail() != null
                        ? b.storeEmail() : "");
                ctx.put("tin", b.storeTaxId() != null ? b.storeTaxId() : "");
                ctx.put("website", b.storeWebsite() != null ? b.storeWebsite() : "https://letispos.com");
                ctx.put("showLogo", true);
                ctx.put("logoSize", b.logoSize() > 0 ? b.logoSize() : 64);
                ctx.put("primaryColor", primary);
                ctx.put("primaryColorDark", darken(primary, 0.15));
                ctx.put("primaryColorLight", lighten(primary, 0.88));
                ctx.put("primaryColorBorder", lighten(primary, 0.60));
                ctx.put("accentColor", (b.accentColor() != null && !b.accentColor().isBlank())
                        ? b.accentColor() : primary);
                ctx.put("fontFamily", (b.fontFamily() != null && !b.fontFamily().isBlank())
                        ? b.fontFamily() : "'Helvetica Neue', Arial, sans-serif");
                ctx.put("paperWidth", mapPaperWidth(b.paperSize()));
                ctx.put("paperHeight", mapPaperHeight(b.paperSize()));
                ctx.put("footerMessage", b.footerMessage() != null ? b.footerMessage() : "");
                return ctx;
            } catch (Exception e) {
                log.warn("Failed to fetch PosSetting for warehouse {}: {}", warehouseId, e.getMessage());
            }
        }

        // Default Letis POS branding
        java.util.HashMap<String, Object> defaults = new java.util.HashMap<>();
        defaults.put("name", "Letis POS");
        defaults.put("logoUrl", letisLogoDataUri());
        defaults.put("address", "");
        defaults.put("phone", "");
        defaults.put("email", "");
        defaults.put("tin", "");
        defaults.put("website", "https://letispos.com");
        defaults.put("showLogo", true);
        defaults.put("showStoreName", true);
        defaults.put("showStoreAddress", false);
        defaults.put("showStorePhone", false);
        defaults.put("showStoreEmail", false);
        defaults.put("logoSize", 64);
        defaults.put("primaryColor", "#16A34A");
        defaults.put("primaryColorDark", "#15803D");
        defaults.put("primaryColorLight", "#ECFDF5");
        defaults.put("primaryColorBorder", "#BBF7D0");
        defaults.put("accentColor", "#16A34A");
        defaults.put("fontFamily", "'Helvetica Neue', Arial, sans-serif");
        defaults.put("paperWidth", "8.27");
        defaults.put("paperHeight", "11.69");
        defaults.put("footerMessage", "");
        return defaults;
    }

    /**
     * Letis POS logo embedded in generated HTML so PDF conversion is self-contained.
     * Prefer PNG because Gotenberg/Chromium handles raster data URIs more reliably than SVG.
     */
    private String letisLogoDataUri() {
        String png = loadLogoDataUri("static/letis-logo.png", "image/png");
        if (!png.isBlank()) {
            return png;
        }
        return loadLogoDataUri("static/letis-logo.svg", "image/svg+xml");
    }

    private String loadLogoDataUri(String resourcePath, String mimeType) {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
            if (in == null) {
                log.warn("Default Letis POS logo resource not found: {}", resourcePath);
                return "";
            }
            String encoded = Base64.getEncoder().encodeToString(in.readAllBytes());
            return "data:" + mimeType + ";base64," + encoded;
        } catch (Exception e) {
            log.warn("Failed to load default Letis POS logo {}: {}", resourcePath, e.getMessage());
            return "";
        }
    }

    private Map<String, String> loadI18nLabels(String locale, UUID tenantId) {
        if (locale == null || locale.isBlank()) locale = "en";
        Map<String, String> labels = new java.util.HashMap<>();
        try {
            i18nRepo.findByLocaleWithFallback(locale, tenantId)
                    .forEach(l -> labels.put(l.getLabelKey(), l.getLabelValue()));
        } catch (Exception e) {
            log.debug("I18n label load failed for locale {}: {}", locale, e.getMessage());
        }
        return labels;
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

    // ---- color helpers for template context ----

    private static String darken(String hex, double factor) {
        try {
            int r = Integer.parseInt(hex.substring(1, 3), 16);
            int g = Integer.parseInt(hex.substring(3, 5), 16);
            int b = Integer.parseInt(hex.substring(5, 7), 16);
            return String.format("#%02X%02X%02X",
                    (int)(r * (1 - factor)), (int)(g * (1 - factor)), (int)(b * (1 - factor)));
        } catch (Exception e) { return hex; }
    }

    private static String lighten(String hex, double factor) {
        try {
            int r = Integer.parseInt(hex.substring(1, 3), 16);
            int g = Integer.parseInt(hex.substring(3, 5), 16);
            int b = Integer.parseInt(hex.substring(5, 7), 16);
            return String.format("#%02X%02X%02X",
                    (int)(r + (255 - r) * factor), (int)(g + (255 - g) * factor), (int)(b + (255 - b) * factor));
        } catch (Exception e) { return hex; }
    }

    private static String mapPaperWidth(String paperSize) {
        if (paperSize == null || paperSize.isBlank()) return "8.27";
        return switch (paperSize.toUpperCase()) {
            case "LETTER" -> "8.5";
            case "LEGAL" -> "8.5";
            case "80MM", "88MM" -> "3.15";
            case "58MM" -> "2.28";
            default -> "8.27"; // A4
        };
    }

    private static String mapPaperHeight(String paperSize) {
        if (paperSize == null || paperSize.isBlank()) return "11.69";
        return switch (paperSize.toUpperCase()) {
            case "LETTER" -> "11.0";
            case "LEGAL" -> "14.0";
            case "80MM", "88MM", "58MM" -> "11.69";
            default -> "11.69"; // A4
        };
    }
}
