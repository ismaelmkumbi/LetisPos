package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.TemplateOverride;
import io.smartpos.documents.domain.repository.TemplateOverrideRepository;
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateOverrideRepository overrideRepo;
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
            "name", "Sample Company",
            "address", "123 Sample Street",
            "phone", "+255 123 456 789",
            "email", "info@sample.com",
            "tin", "123-456-789"
        ));
        data.put("document", Map.of(
            "number", "SMP-000001",
            "date", Instant.now().toString(),
            "status", "draft"
        ));
        data.put("customer", Map.of(
            "name", "Sample Customer",
            "address", "456 Customer Ave",
            "phone", "+255 987 654 321"
        ));
        data.put("items", List.of(
            Map.of("name", "Sample Product A", "quantity", 2, "unitPrice", "10,000",
                   "total", "20,000"),
            Map.of("name", "Sample Product B", "quantity", 1, "unitPrice", "15,000",
                   "total", "15,000")
        ));
        data.put("totals", Map.of(
            "subtotal", "35,000",
            "tax", "6,300",
            "grand_total", "41,300"
        ));
        return data;
    }
}
