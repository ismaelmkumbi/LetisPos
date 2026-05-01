package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.CreateSaleRequest;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.api.dto.SaleReturnDto;
import io.smartpos.sales.application.SaleReturnService;
import io.smartpos.sales.application.SaleService;
import io.smartpos.sales.domain.model.Sale;
import io.smartpos.sales.domain.model.SaleStatus;
import io.smartpos.sales.domain.repository.SaleRepository;
import io.smartpos.sales.infrastructure.pdf.InvoicePdfGenerator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;
    private final SaleReturnService returnService;
    private final SaleRepository saleRepo;
    private final InvoicePdfGenerator pdf;

    @GetMapping
    @PreAuthorize("hasAuthority('sale.view')")
    public Page<SaleDto> search(@RequestParam(required = false) LocalDate dateFrom,
                                @RequestParam(required = false) LocalDate dateTo,
                                @RequestParam(required = false) UUID customerId,
                                @RequestParam(required = false) UUID warehouseId,
                                @RequestParam(required = false) SaleStatus status,
                                Pageable pageable) {
        return saleService.search(dateFrom, dateTo, customerId, warehouseId, status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('sale.view')")
    public SaleDto get(@PathVariable UUID id) { return saleService.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<SaleDto> create(@Valid @RequestBody CreateSaleRequest req,
                                          @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.create(req, userIdFrom(jwt), false));
    }

    @PostMapping("/{id}/commit")
    @PreAuthorize("hasAuthority('sale.update') or hasAuthority('sale.create')")
    public SaleDto commit(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return saleService.commit(id, userIdFrom(jwt));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('sale.delete')")
    public SaleDto cancel(@PathVariable UUID id) {
        return saleService.cancel(id);
    }

    /**
     * Called by Payment Service when a payment is recorded against this sale.
     * Adds to {@code paid_total} and recomputes {@code payment_status}.
     *
     * <p>{@code paymentId} is the idempotency key — duplicate calls with the
     * same paymentId are silent no-ops (Phase 6c).
     */
    public record ApplyPaymentRequest(UUID paymentId, java.math.BigDecimal amount) {}

    @PostMapping("/{id}/apply-payment")
    @PreAuthorize("hasAuthority('payment.record')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void applyPayment(@PathVariable UUID id, @RequestBody ApplyPaymentRequest req) {
        saleService.applyPayment(id, req.paymentId(), req.amount(),
                io.smartpos.sales.domain.model.SalePaymentApplied.Source.FEIGN);
    }

    // ---- Returns ----
    @PostMapping("/{id}/returns")
    @PreAuthorize("hasAuthority('sale.return')")
    public ResponseEntity<SaleReturnDto> createReturn(@PathVariable UUID id,
                                                      @Valid @RequestBody SaleReturnDto.CreateRequest req,
                                                      @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(returnService.create(id, req, userIdFrom(jwt)));
    }

    @GetMapping("/returns/{returnId}")
    @PreAuthorize("hasAuthority('sale.view') or hasAuthority('sale.return')")
    public SaleReturnDto getReturn(@PathVariable UUID returnId) { return returnService.get(returnId); }

    // ---- Invoice PDF ----
    @GetMapping(value = "/{id}/invoice.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAuthority('sale.view')")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable UUID id) {
        Sale sale = saleRepo.findByIdWithLines(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        byte[] body = pdf.render(sale);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.setContentDisposition(org.springframework.http.ContentDisposition.inline()
                .filename(sale.getRef() + ".pdf").build());
        return ResponseEntity.ok().headers(h).body(body);
    }

    private static UUID userIdFrom(Jwt jwt) {
        return jwt == null ? null : UUID.fromString(jwt.getSubject());
    }
}
