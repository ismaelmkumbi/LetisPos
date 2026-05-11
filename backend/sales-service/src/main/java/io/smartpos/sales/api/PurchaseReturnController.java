package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.PurchaseReturnDto;
import io.smartpos.sales.application.PurchaseReturnService;
import io.smartpos.sales.domain.model.ReturnStatus;
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
@RequiredArgsConstructor
public class PurchaseReturnController {

    private final PurchaseReturnService service;

    // -- Global list/search --
    @GetMapping("/api/v1/purchase-returns")
    @PreAuthorize("hasAuthority('purchase.view')")
    public Page<PurchaseReturnDto> search(@RequestParam(required = false) String search,
                                           @RequestParam(required = false) ReturnStatus status,
                                           @RequestParam(required = false) UUID supplierId,
                                           @RequestParam(required = false) LocalDate dateFrom,
                                           @RequestParam(required = false) LocalDate dateTo,
                                           Pageable pageable) {
        return service.search(search, status, supplierId, dateFrom, dateTo, pageable);
    }

    // -- Per-purchase create / list --
    @PostMapping("/api/v1/purchases/{purchaseId}/returns")
    @PreAuthorize("hasAuthority('purchase.return') or hasAuthority('purchase.update')")
    public ResponseEntity<PurchaseReturnDto> create(
            @PathVariable UUID purchaseId,
            @Valid @RequestBody PurchaseReturnDto.CreateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(purchaseId, req, userIdFrom(jwt)));
    }

    @GetMapping("/api/v1/purchases/{purchaseId}/returns")
    @PreAuthorize("hasAuthority('purchase.view')")
    public Page<PurchaseReturnDto> listForPurchase(@PathVariable UUID purchaseId, Pageable pageable) {
        return service.listForPurchase(purchaseId, pageable);
    }

    // -- Single return --
    @GetMapping("/api/v1/purchase-returns/{id}")
    @PreAuthorize("hasAuthority('purchase.view')")
    public PurchaseReturnDto get(@PathVariable UUID id) { return service.get(id); }

    // -- Complete --
    @PostMapping("/api/v1/purchase-returns/{id}/complete")
    @PreAuthorize("hasAuthority('purchase.update')")
    public PurchaseReturnDto complete(@PathVariable UUID id) {
        return service.complete(id);
    }

    private static UUID userIdFrom(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
