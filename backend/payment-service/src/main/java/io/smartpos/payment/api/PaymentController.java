package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.PaymentDto;
import io.smartpos.payment.application.PaymentService;
import io.smartpos.payment.domain.model.ReferenceType;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('payment.view')")
    public Page<PaymentDto> list(@RequestParam(required = false) ReferenceType referenceType,
                                 @RequestParam(required = false) UUID referenceId,
                                 @RequestParam(required = false) UUID accountId,
                                 @RequestParam(required = false) LocalDate dateFrom,
                                 @RequestParam(required = false) LocalDate dateTo,
                                 Pageable pageable) {
        return service.search(referenceType, referenceId, accountId, dateFrom, dateTo, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('payment.view')")
    public PaymentDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('payment.record')")
    public ResponseEntity<PaymentDto> record(@Valid @RequestBody PaymentDto.CreateRequest req,
                                             @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.record(req, userIdFrom(jwt)));
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('payment.refund')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void refund(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? null : body.get("reason");
        service.markRefunded(id, reason);
    }

    /**
     * Capture payment — called by commerce-service during checkout.
     * This is an internal endpoint (service-to-service). Creates a minimal
     * payment record; accounting details (referenceId, accountId) are resolved
     * after the sale is created in the sales service.
     */
    @PostMapping("/capture")
    public ResponseEntity<PaymentDto> capture(@RequestBody Map<String, Object> body) {
        BigDecimal amount = new java.math.BigDecimal(body.get("amount").toString());
        String currency = body.get("currency") != null ? body.get("currency").toString() : "TZS";
        String notes = body.get("description") != null ? body.get("description").toString() : null;
        String paymentMethodId = body.get("paymentMethodId") != null
            ? body.get("paymentMethodId").toString() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.capturePayment(amount, currency, notes, paymentMethodId));
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
