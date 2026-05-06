package io.smartpos.integration.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.integration.application.qb.QuickBooksService;
import io.smartpos.integration.application.woo.WooCommerceService;
import io.smartpos.integration.application.zatca.ZatcaService;
import io.smartpos.integration.domain.model.IntegrationSync;
import io.smartpos.integration.domain.repository.IntegrationSyncRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final ZatcaService zatca;
    private final WooCommerceService woo;
    private final QuickBooksService qb;
    private final IntegrationSyncRepository syncRepo;

    // ----- Sync log -----
    @GetMapping("/syncs")
    @PreAuthorize("hasAuthority('integration.view')")
    public Page<IntegrationSync> listSyncs(@RequestParam(required = false) String provider,
                                           @RequestParam(required = false) String status,
                                           Pageable pageable) {
        return syncRepo.search(provider, status, TenantContext.require(), pageable);
    }

    // ----- ZATCA -----
    @PostMapping("/zatca/qr")
    @PreAuthorize("hasAuthority('integration.zatca')")
    public Map<String, String> zatcaQr(@RequestParam UUID saleId,
                                       @RequestParam String invoiceTimestampIso,
                                       @RequestParam String invoiceTotal,
                                       @RequestParam String vatTotal) {
        String qr = zatca.buildQrCode(invoiceTimestampIso, invoiceTotal, vatTotal);
        zatca.recordInvoice(saleId, Map.of(
                "saleId", saleId,
                "ts", invoiceTimestampIso,
                "total", invoiceTotal,
                "vat", vatTotal
        ), qr);
        return Map.of("qr", qr);
    }

    // ----- WooCommerce push -----
    @PostMapping("/woocommerce/products/{productId}")
    @PreAuthorize("hasAuthority('integration.woo')")
    public IntegrationSync pushWooProduct(@PathVariable UUID productId,
                                          @RequestBody Map<String, Object> payload) {
        return woo.pushProduct(productId, payload);
    }

    // ----- QuickBooks push -----
    @PostMapping("/quickbooks/invoices/{saleId}")
    @PreAuthorize("hasAuthority('integration.quickbooks')")
    public IntegrationSync pushQbInvoice(@PathVariable UUID saleId,
                                         @RequestBody Map<String, Object> payload) {
        return qb.pushInvoice(saleId, payload);
    }
}
