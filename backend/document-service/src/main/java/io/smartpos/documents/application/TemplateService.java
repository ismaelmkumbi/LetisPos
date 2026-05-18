package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.TemplateOverride;
import io.smartpos.documents.domain.model.TemplateVersion;
import io.smartpos.documents.domain.repository.TemplateOverrideRepository;
import io.smartpos.documents.domain.repository.TemplateVersionRepository;
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateOverrideRepository overrideRepo;
    private final TemplateVersionRepository templateVersionRepo;
    private final TemplateResolver resolver;
    private final TemplateRenderer renderer;
    private final GotenbergClient gotenbergClient;

    private static final List<String> BUILT_IN_TYPES = List.of(
        "quotation", "tax-invoice", "proforma-invoice", "purchase-order",
        "payment-receipt", "credit-note", "delivery-note", "goods-received",
        "customer-statement",
        "stock-transfer", "stock-count", "stock-adjustment",
        "batch-traceability", "expiry-report",
        "journal-voucher", "payment-voucher", "receipt-voucher",
        "expense-voucher", "debit-note",
        "supplier-rfq", "supplier-invoice", "purchase-return",
        "work-order", "service-report", "payslip",
        "delivery-manifest", "packing-slip",
        "contract", "warranty-certificate", "sales-return", "refund-receipt",
        "price-tag", "audit-report", "account-confirmation"
    );

    public record TemplateInfo(String documentType, String name, boolean isOverridden,
                               List<String> placeholders) {}

    public List<TemplateInfo> listTemplates() {
        UUID tenantId = TenantContext.require();
        Set<String> overridden = overrideRepo.findByTenantId(tenantId).stream()
                .filter(TemplateOverride::isActive)
                .map(TemplateOverride::getDocumentType)
                .collect(Collectors.toSet());

        return BUILT_IN_TYPES.stream()
                .map(t -> new TemplateInfo(t, toDisplayName(t), overridden.contains(t),
                        List.of("{{company.name}}", "{{document.number}}", "{{document.date}}",
                                "{{customer.name}}", "{{items}}", "{{totals.grand_total}}")))
                .toList();
    }

    public String getResolvedTemplate(String documentType) throws IOException {
        UUID tenantId = TenantContext.require();
        String file = documentType + ".hbs";
        return resolver.resolve(tenantId, documentType, file);
    }

    @Transactional
    public TemplateOverride saveOverride(String documentType, String bodyHtml, String name) {
        UUID tenantId = TenantContext.require();
        TemplateOverride override = overrideRepo
                .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType)
                .orElseGet(() -> TemplateOverride.builder()
                        .tenantId(tenantId)
                        .documentType(documentType)
                        .build());

        // Archive current version before updating
        if (override.getId() != null) {
            int nextVersion = templateVersionRepo.countByTemplateOverrideId(override.getId()) + 1;
            TemplateVersion archived = TemplateVersion.builder()
                .templateOverrideId(override.getId())
                .versionNumber(nextVersion)
                .bodyHtml(override.getBodyHtml())
                .changeDescription("Template updated")
                .build();
            templateVersionRepo.save(archived);
        }

        override.setBodyHtml(bodyHtml);
        override.setName(name != null ? name : toDisplayName(documentType));
        override.setActive(true);
        override.setUpdatedAt(Instant.now());
        return overrideRepo.save(override);
    }

    @Transactional
    public void deleteOverride(String documentType) {
        UUID tenantId = TenantContext.require();
        overrideRepo.findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType)
                .ifPresent(o -> {
                    o.setActive(false);
                    o.setUpdatedAt(Instant.now());
                    overrideRepo.save(o);
                });
    }

    @Transactional
    public void rollback(String documentType, int targetVersion) {
        UUID tenantId = TenantContext.require();
        TemplateOverride override = overrideRepo
            .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType)
            .orElseThrow(() -> new IllegalArgumentException("No active override for: " + documentType));

        TemplateVersion version = templateVersionRepo
            .findByTemplateOverrideIdOrderByVersionNumberDesc(override.getId())
            .stream()
            .filter(v -> v.getVersionNumber() == targetVersion)
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Version not found: " + targetVersion));

        override.setBodyHtml(version.getBodyHtml());
        override.setUpdatedAt(Instant.now());
        overrideRepo.save(override);
    }

    public byte[] preview(String documentType, String bodyHtml) throws Exception {
        Map<String, Object> sampleData = createSampleData(documentType);
        String html = renderer.render(bodyHtml, sampleData);
        return gotenbergClient.convertHtmlToPdf(html);
    }

    private String toDisplayName(String type) {
        return Arrays.stream(type.split("-"))
                .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1))
                .collect(Collectors.joining(" "));
    }

    private Map<String, Object> createSampleData(String documentType) {
        Map<String, Object> data = new HashMap<>();
        data.put("company", Map.of(
            "name", "Letis POS",
            "address", "Dar es Salaam, Tanzania",
            "phone", "+255 712 345 678",
            "email", "hello@letispos.com",
            "tin", "123-456-789",
            "website", "https://letispos.com",
            "showLogo", true,
            "logoUrl", letisLogoSvgDataUri(),
            "logoSize", 64
        ));
        data.put("document", Map.of(
            "number", "INV-2026-000100",
            "date", java.time.LocalDate.now().toString(),
            "status", "draft"
        ));
        data.put("customer", Map.of(
            "name", "Juma Mwangi",
            "address", "Kariakoo, Dar es Salaam",
            "phone", "+255 765 432 100"
        ));
        data.put("items", List.of(
            Map.of("name", "Mchele Mbeya 5kg", "quantity", 2, "unitPrice", "22,000",
                   "taxRate", "18", "total", "51,920"),
            Map.of("name", "Sukari Kilo 1kg", "quantity", 5, "unitPrice", "3,200",
                   "taxRate", "0", "total", "16,000"),
            Map.of("name", "Mafuta ya Kupikia 1L", "quantity", 3, "unitPrice", "6,200",
                   "taxRate", "0", "total", "18,600"),
            Map.of("name", "Unga wa Ngano 2kg", "quantity", 4, "unitPrice", "5,300",
                   "taxRate", "18", "total", "25,016")
        ));
        data.put("totals", Map.of(
            "subtotal", "101,900",
            "tax", "9,636",
            "grandTotal", "111,536"
        ));
        return data;
    }

    private String letisLogoSvgDataUri() {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("static/letis-logo.svg")) {
            if (in == null) return "";
            String encoded = Base64.getEncoder().encodeToString(in.readAllBytes());
            return "data:image/svg+xml;base64," + encoded;
        } catch (Exception e) {
            return "";
        }
    }
}
