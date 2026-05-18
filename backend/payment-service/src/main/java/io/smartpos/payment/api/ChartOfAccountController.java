package io.smartpos.payment.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.ChartOfAccountDto;
import io.smartpos.payment.application.AccountingSetupService;
import io.smartpos.payment.application.ChartOfAccountService;
import io.smartpos.payment.domain.model.AccountClass;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chart-of-accounts")
@RequiredArgsConstructor
public class ChartOfAccountController {

    private final ChartOfAccountService service;
    private final AccountingSetupService setupService;

    @GetMapping
    @PreAuthorize("hasAuthority('account.view')")
    public List<ChartOfAccountDto> list(
            @RequestParam(required = false) AccountClass accountClass,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(accountClass, includeInactive);
    }

    /** Available template accounts the tenant can activate. */
    @GetMapping("/templates")
    @PreAuthorize("hasAuthority('account.view')")
    public List<ChartOfAccountDto> templates() {
        return service.templates();
    }

    /** Activate a template account. */
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('account.manage')")
    public ChartOfAccountDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('account.view')")
    public ChartOfAccountDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('account.manage')")
    public ResponseEntity<ChartOfAccountDto> create(@Valid @RequestBody ChartOfAccountDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('account.view') or hasAuthority('report.financial')")
    public List<ChartOfAccountService.ChartOfAccountSummary> summary() {
        return service.summary();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('account.manage')")
    public ChartOfAccountDto update(@PathVariable UUID id, @RequestBody ChartOfAccountDto.UpdateRequest req) {
        return service.update(id, req);
    }

    /**
     * One-click accounting setup for the current tenant.
     * Creates the full COA tree, default operational accounts,
     * posting rules, and expense/deposit categories.
     */
    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('account.manage')")
    public AccountingSetupService.SetupResult initialize() {
        return setupService.initializeTenant(TenantContext.require());
    }
}
