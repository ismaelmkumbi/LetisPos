package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.SupplierPaymentDto;
import io.smartpos.payment.application.PaymentService;
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
@RequestMapping("/api/v1/payments/supplier")
@RequiredArgsConstructor
public class SupplierPaymentController {

    private final PaymentService service;

    @GetMapping
    @PreAuthorize("hasAuthority('payment.view')")
    public Page<SupplierPaymentDto> list(@RequestParam(required = false) UUID supplierId,
                                          @RequestParam(required = false) String method,
                                          @RequestParam(required = false) LocalDate dateFrom,
                                          @RequestParam(required = false) LocalDate dateTo,
                                          @RequestParam(required = false) String search,
                                          Pageable pageable) {
        return service.searchSupplierPayments(supplierId, method, dateFrom, dateTo, search, pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('payment.record')")
    public ResponseEntity<SupplierPaymentDto> create(
            @Valid @RequestBody SupplierPaymentDto.CreateSupplierPaymentRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.recordSupplierPayment(req, userIdFrom(jwt)));
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
