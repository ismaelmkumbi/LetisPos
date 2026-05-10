package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.PurchaseDto;
import io.smartpos.sales.application.PurchaseService;
import io.smartpos.sales.domain.model.PurchaseStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService service;

    @GetMapping
    @PreAuthorize("hasAuthority('purchase.view')")
    public Page<PurchaseDto> search(@RequestParam(required = false) LocalDate dateFrom,
                                    @RequestParam(required = false) LocalDate dateTo,
                                    @RequestParam(required = false) UUID supplierId,
                                    @RequestParam(required = false) UUID warehouseId,
                                    @RequestParam(required = false) PurchaseStatus status,
                                    Pageable pageable) {
        return service.search(dateFrom, dateTo, supplierId, warehouseId, status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('purchase.view')")
    public PurchaseDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('purchase.create')")
    public ResponseEntity<PurchaseDto> create(@Valid @RequestBody PurchaseDto.CreateRequest req,
                                              @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, userIdFrom(jwt)));
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAuthority('purchase.update')")
    public PurchaseDto receive(@PathVariable UUID id) { return service.receive(id); }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('purchase.update')")
    public PurchaseDto cancel(@PathVariable UUID id) { return service.cancel(id); }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('purchase.delete') or hasAuthority('purchase.update')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    /**
     * Called by Payment Service when a payment is recorded against this purchase.
     * {@code paymentId} is the idempotency key — duplicate calls with the same
     * paymentId are silent no-ops.
     */
    public record ApplyPaymentRequest(UUID paymentId, java.math.BigDecimal amount) {}

    @PostMapping("/{id}/apply-payment")
    @PreAuthorize("hasAuthority('payment.record')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void applyPayment(@PathVariable UUID id, @RequestBody ApplyPaymentRequest req) {
        service.applyPayment(id, req.paymentId(), req.amount(),
                io.smartpos.sales.domain.model.PurchasePaymentApplied.Source.FEIGN);
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
