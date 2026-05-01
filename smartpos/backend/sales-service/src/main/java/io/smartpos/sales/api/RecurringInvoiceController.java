package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.RecurringInvoiceDto;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.application.RecurringInvoiceService;
import io.smartpos.sales.domain.model.RecurringInvoice;
import io.smartpos.sales.domain.model.RecurringStatus;
import io.smartpos.sales.domain.repository.RecurringInvoiceRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recurring-invoices")
@RequiredArgsConstructor
public class RecurringInvoiceController {

    private final RecurringInvoiceService service;
    private final RecurringInvoiceRepository repo;

    @GetMapping
    @PreAuthorize("hasAuthority('recurring.view')")
    public Page<RecurringInvoiceDto> search(@RequestParam(required = false) RecurringStatus status,
                                            @RequestParam(required = false) UUID customerId,
                                            @RequestParam(required = false) UUID warehouseId,
                                            Pageable pageable) {
        return service.search(status, customerId, warehouseId, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('recurring.view')")
    public RecurringInvoiceDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('recurring.manage')")
    public ResponseEntity<RecurringInvoiceDto> create(@Valid @RequestBody RecurringInvoiceDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('recurring.manage')")
    public RecurringInvoiceDto update(@PathVariable UUID id, @RequestBody RecurringInvoiceDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @PostMapping("/{id}/pause")
    @PreAuthorize("hasAuthority('recurring.manage')")
    public RecurringInvoiceDto pause(@PathVariable UUID id) { return service.pause(id); }

    @PostMapping("/{id}/resume")
    @PreAuthorize("hasAuthority('recurring.manage')")
    public RecurringInvoiceDto resume(@PathVariable UUID id) { return service.resume(id); }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('recurring.manage')")
    public RecurringInvoiceDto cancel(@PathVariable UUID id) { return service.cancel(id); }

    /** Manually trigger generation now (admin button) — same code path as the scheduler. */
    @PostMapping("/{id}/run-now")
    @PreAuthorize("hasAuthority('recurring.manage')")
    public SaleDto runNow(@PathVariable UUID id) {
        RecurringInvoice r = repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring invoice not found"));
        return service.generateOne(r);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('recurring.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
