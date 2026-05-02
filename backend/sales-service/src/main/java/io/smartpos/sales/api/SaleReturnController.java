/*
 * Top-level Returns endpoint — used by the Returns index page on the frontend.
 * Per-sale operations (create + get-by-id) still live on SaleController under
 * /api/v1/sales/{id}/returns and /api/v1/sales/returns/{id}.
 */
package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.SaleReturnDto;
import io.smartpos.sales.application.SaleReturnService;
import io.smartpos.sales.domain.model.ReturnStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/returns")
@RequiredArgsConstructor
public class SaleReturnController {

    private final SaleReturnService service;

    @GetMapping
    @PreAuthorize("hasAuthority('sale.view') or hasAuthority('sale.return')")
    public Page<SaleReturnDto> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) UUID warehouseId,
            @RequestParam(required = false) ReturnStatus status,
            Pageable pageable) {
        return service.search(from, to, customerId, warehouseId, status, pageable);
    }
}
