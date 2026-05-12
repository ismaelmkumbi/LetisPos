package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.AccountDto;
import io.smartpos.payment.api.dto.AccountTransferDto;
import io.smartpos.payment.api.dto.LedgerDto;
import io.smartpos.payment.application.AccountService;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService service;

    @GetMapping
    @PreAuthorize("hasAuthority('account.manage') or hasAuthority('payment.view')")
    public List<AccountDto> list() { return service.list(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('account.manage') or hasAuthority('payment.view')")
    public AccountDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('account.manage')")
    public ResponseEntity<AccountDto> create(@Valid @RequestBody AccountDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('account.manage')")
    public AccountDto update(@PathVariable UUID id, @Valid @RequestBody AccountDto.CreateRequest req) {
        return service.update(id, req);
    }

    @GetMapping("/{id}/ledger")
    @PreAuthorize("hasAuthority('account.manage') or hasAuthority('payment.view')")
    public Page<LedgerDto> ledger(@PathVariable UUID id,
                                  @RequestParam(required = false) LocalDate dateFrom,
                                  @RequestParam(required = false) LocalDate dateTo,
                                  Pageable pageable) {
        return service.ledger(id, dateFrom, dateTo, pageable);
    }

    @GetMapping("/transfers")
    @PreAuthorize("hasAuthority('account.manage') or hasAuthority('payment.view')")
    public Page<AccountTransferDto> listTransfers(Pageable pageable) {
        return service.listTransfers(pageable);
    }

    @PostMapping("/transfers")
    @PreAuthorize("hasAuthority('account.manage')")
    public ResponseEntity<AccountTransferDto> transfer(@Valid @RequestBody AccountTransferDto.CreateRequest req,
                                                       @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.transfer(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }
}
