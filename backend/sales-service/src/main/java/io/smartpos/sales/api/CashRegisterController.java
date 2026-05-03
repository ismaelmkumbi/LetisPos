package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.CashRegisterSessionDto;
import io.smartpos.sales.application.CashRegisterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cash-registers")
@RequiredArgsConstructor
public class CashRegisterController {

    private final CashRegisterService service;

    @PostMapping("/open")
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<CashRegisterSessionDto> open(
        @RequestBody CashRegisterSessionDto.OpenRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        UUID userId = userIdFrom(jwt);
        BigDecimal openingBalance = request.openingBalance() != null
            ? request.openingBalance() : BigDecimal.ZERO;

        CashRegisterSessionDto session = service.open(request.warehouseId(), userId, openingBalance);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @GetMapping("/current")
    @PreAuthorize("hasAuthority('sale.view')")
    public ResponseEntity<CashRegisterSessionDto> getCurrent(
        @RequestParam UUID warehouseId) {

        CashRegisterSessionDto session = service.getCurrent(warehouseId);
        return session != null
            ? ResponseEntity.ok(session)
            : ResponseEntity.noContent().build();
    }

    @PostMapping("/close")
    @PreAuthorize("hasAuthority('sale.create')")
    public ResponseEntity<CashRegisterSessionDto> close(
        @RequestParam UUID warehouseId,
        @RequestBody CashRegisterSessionDto.CloseRequest request,
        @AuthenticationPrincipal Jwt jwt) {

        UUID userId = userIdFrom(jwt);
        CashRegisterSessionDto session = service.close(warehouseId, userId,
            request.countedCash(), request.notes());
        return ResponseEntity.ok(session);
    }

    @GetMapping("/history")
    @PreAuthorize("hasAuthority('sale.view')")
    public ResponseEntity<List<CashRegisterSessionDto>> history(
        @RequestParam UUID warehouseId) {

        return ResponseEntity.ok(service.history(warehouseId));
    }

    private static UUID userIdFrom(Jwt jwt) {
        return jwt == null ? null : UUID.fromString(jwt.getSubject());
    }
}
