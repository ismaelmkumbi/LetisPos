package io.smartpos.billing.application;

import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.model.Subscription;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import io.smartpos.billing.domain.repository.SubscriptionRepository;
import io.smartpos.billing.infrastructure.feign.DocumentFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoicePdfService {

    private final DocumentFeign documentFeign;
    private final InvoiceRepository invoiceRepo;
    private final SubscriptionRepository subscriptionRepo;

    public void generateInvoicePdf(Invoice invoice) {
        try {
            Subscription sub = subscriptionRepo.findById(invoice.getSubscriptionId())
                .orElse(null);
            String planName = sub != null ? sub.getPlanCode() + " Plan - Monthly" : "Subscription";

            Map<String, Object> req = Map.of(
                "documentType", "payment-receipt",
                "referenceType", "invoice",
                "referenceId", invoice.getId().toString(),
                "contextData", Map.of(
                    "customer", Map.of("name", "Tenant " + invoice.getTenantId()),
                    "document", Map.of(
                        "number", invoice.getInvoiceNumber(),
                        "date", invoice.getCreatedAt().toString()
                    ),
                    "totals", Map.of(
                        "grandTotal", invoice.getAmountTzs().toString(),
                        "subtotal", invoice.getAmountTzs().toString()
                    ),
                    "items", List.of(Map.of(
                        "name", planName,
                        "quantity", 1,
                        "unitPrice", invoice.getAmountTzs().toString(),
                        "total", invoice.getAmountTzs().toString()
                    ))
                )
            );
            Map<String, Object> doc = documentFeign.generateDocument(req);
            if (doc != null && doc.get("id") != null) {
                invoice.setDocumentId((String) doc.get("id"));
                invoiceRepo.save(invoice);
                log.info("Generated invoice PDF: invoice={}, documentId={}",
                    invoice.getInvoiceNumber(), doc.get("id"));
            }
        } catch (Exception e) {
            log.warn("Failed to generate invoice PDF for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }
}
