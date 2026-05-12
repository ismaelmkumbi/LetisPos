package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.AccountDto;
import io.smartpos.payment.api.dto.AccountTransferDto;
import io.smartpos.payment.api.dto.LedgerDto;
import io.smartpos.payment.domain.model.*;
import io.smartpos.payment.domain.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository        accountRepo;
    private final LedgerRepository         ledgerRepo;
    private final AccountTransferRepository transferRepo;

    @Transactional(readOnly = true)
    public List<AccountDto> list() {
        return accountRepo.findByTenantId(TenantContext.require()).stream().map(AccountDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AccountDto get(UUID id) {
        return accountRepo.findById(id).map(AccountDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional
    public AccountDto create(AccountDto.CreateRequest req) {
        Account a = Account.builder()
                .name(req.name())
                .number(req.number())
                .type(Optional.ofNullable(req.type()).orElse(AccountType.CASH))
                .currency(req.currency() != null ? req.currency() : "TZS")
                .initialBalance(nz(req.initialBalance()))
                .balance(nz(req.initialBalance()))
                .notes(req.notes())
                .active(true)
                .tenantId(TenantContext.require())
                .build();
        return AccountDto.from(accountRepo.save(a));
    }

    @Transactional
    public AccountDto update(UUID id, AccountDto.CreateRequest req) {
        Account a = accountRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        a.setName(req.name());
        a.setNumber(req.number());
        if (req.type()     != null) a.setType(req.type());
        if (req.currency() != null) a.setCurrency(req.currency());
        if (req.notes()    != null) a.setNotes(req.notes());
        return AccountDto.from(accountRepo.save(a));
    }

    @Transactional(readOnly = true)
    public Page<LedgerDto> ledger(UUID accountId, LocalDate from, LocalDate to, Pageable pageable) {
        return ledgerRepo.ledgerFor(accountId, from, to, TenantContext.require(), pageable).map(LedgerDto::from);
    }

    public Page<AccountTransferDto> listTransfers(Pageable pageable) {
        return transferRepo.findAll(pageable).map(AccountTransferDto::from);
    }

    /**
     * Atomic account-to-account transfer: locks both accounts (ordered by id to
     * avoid deadlocks), posts two ledger entries, records the transfer header.
     */
    @Transactional
    public AccountTransferDto transfer(AccountTransferDto.CreateRequest req, UUID userId) {
        if (req.fromAccountId().equals(req.toAccountId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from and to accounts must differ");
        }

        UUID tenantId = TenantContext.require();

        // Deterministic lock order
        UUID first  = req.fromAccountId().compareTo(req.toAccountId()) < 0 ? req.fromAccountId() : req.toAccountId();
        UUID second = first.equals(req.fromAccountId()) ? req.toAccountId() : req.fromAccountId();
        Account a1 = accountRepo.findByIdForUpdate(first, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found"));
        Account a2 = accountRepo.findByIdForUpdate(second, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found"));

        Account from = a1.getId().equals(req.fromAccountId()) ? a1 : a2;
        Account to   = from == a1 ? a2 : a1;

        BigDecimal newFrom = from.applyDelta(req.amount().negate());
        BigDecimal newTo   = to.applyDelta(req.amount());
        accountRepo.save(from);
        accountRepo.save(to);

        AccountTransfer transfer = AccountTransfer.builder()
                .ref(nextTransferRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .fromAccountId(from.getId())
                .toAccountId(to.getId())
                .amount(req.amount())
                .notes(req.notes())
                .userId(userId)
                .tenantId(tenantId)
                .build();
        AccountTransfer saved = transferRepo.save(transfer);

        // Two ledger entries — one per leg
        ledgerRepo.save(LedgerEntry.builder()
                .accountId(from.getId()).txnDate(saved.getDate())
                .referenceType(ReferenceType.TRANSFER).referenceId(saved.getId())
                .description("Transfer out to " + to.getName() + " (" + saved.getRef() + ")")
                .debit(BigDecimal.ZERO).credit(req.amount())
                .balanceAfter(newFrom)
                .tenantId(tenantId)
                .build());
        ledgerRepo.save(LedgerEntry.builder()
                .accountId(to.getId()).txnDate(saved.getDate())
                .referenceType(ReferenceType.TRANSFER).referenceId(saved.getId())
                .description("Transfer in from " + from.getName() + " (" + saved.getRef() + ")")
                .debit(req.amount()).credit(BigDecimal.ZERO)
                .balanceAfter(newTo)
                .tenantId(tenantId)
                .build());

        return AccountTransferDto.from(saved);
    }

    private String nextTransferRef() {
        String prefix = "AT-" + Year.now().getValue() + "-";
        long n = transferRepo.countByRefStartingWithAndTenantId(prefix, TenantContext.require()) + 1;
        return prefix + String.format("%06d", n);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
