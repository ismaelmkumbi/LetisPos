package io.smartpos.billing.api;

import io.smartpos.billing.application.InvoicePdfService;
import io.smartpos.billing.domain.model.Invoice;
import io.smartpos.billing.domain.repository.InvoiceRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceRepository invoiceRepo;
    private final InvoicePdfService invoicePdfService;

    // List invoices for a tenant (admin or self-service)
    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('billing.view') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<List<Invoice>> listByTenant(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(invoiceRepo.findByTenantIdOrderByCreatedAtDesc(tenantId));
    }

    // Admin: list all unpaid/overdue invoices
    @GetMapping("/admin/pending")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<List<Invoice>> listPending() {
        return ResponseEntity.ok(invoiceRepo.findByStatus("PENDING"));
    }

    // Admin: mark a manual payment as paid
    @PostMapping("/admin/{id}/mark-paid")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<Invoice> markPaid(
            @PathVariable UUID id,
            @RequestBody @Valid MarkPaidRequest request) {
        Invoice invoice = invoiceRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        invoice.setStatus("PAID");
        invoice.setPaymentMethod(request.paymentMethod());
        invoice.setPaymentReference(request.paymentReference());
        invoice.setPaidAt(Instant.now());
        invoice = invoiceRepo.save(invoice);

        // Generate invoice PDF receipt
        invoicePdfService.generateInvoicePdf(invoice);

        return ResponseEntity.ok(invoice);
    }

    public record MarkPaidRequest(
        @NotBlank String paymentMethod,
        String paymentReference
    ) {}
}
