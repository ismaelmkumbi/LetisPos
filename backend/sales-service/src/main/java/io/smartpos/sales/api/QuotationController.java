package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.QuotationDto;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.application.QuotationService;
import io.smartpos.sales.domain.model.QuotationStatus;
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
@RequestMapping("/api/v1/quotations")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService service;

    @GetMapping
    @PreAuthorize("hasAuthority('quotation.manage') or hasAuthority('sale.view')")
    public Page<QuotationDto> search(@RequestParam(required = false) LocalDate dateFrom,
                                     @RequestParam(required = false) LocalDate dateTo,
                                     @RequestParam(required = false) UUID customerId,
                                     @RequestParam(required = false) QuotationStatus status,
                                     Pageable pageable) {
        return service.search(dateFrom, dateTo, customerId, status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('quotation.manage') or hasAuthority('sale.view')")
    public QuotationDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('quotation.manage')")
    public ResponseEntity<QuotationDto> create(@Valid @RequestBody QuotationDto.CreateRequest req,
                                               @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, userIdFrom(jwt)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('quotation.manage')")
    public QuotationDto setStatus(@PathVariable UUID id, @RequestParam QuotationStatus status) {
        return service.updateStatus(id, status);
    }

    @PostMapping("/{id}/convert")
    @PreAuthorize("hasAuthority('sale.create')")
    public SaleDto convert(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.convertToSale(id, userIdFrom(jwt));
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
