package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.DepositDto;
import io.smartpos.payment.domain.model.*;
import io.smartpos.payment.domain.repository.AccountRepository;
import io.smartpos.payment.domain.repository.DepositCategoryRepository;
import io.smartpos.payment.domain.repository.DepositRepository;
import io.smartpos.payment.domain.repository.LedgerRepository;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepositService {

    private final DepositRepository         depositRepo;
    private final DepositCategoryRepository catRepo;
    private final AccountRepository         accountRepo;
    private final LedgerRepository          ledgerRepo;
    private final OutboxPublisher           outbox;

    @Transactional(readOnly = true)
    public Page<DepositDto> search(UUID accountId, UUID categoryId,
                                   LocalDate from, LocalDate to, Pageable p) {
        return depositRepo.search(accountId, categoryId, from, to, TenantContext.get().orElse(null), p).map(DepositDto::from);
    }

    @Transactional(readOnly = true)
    public List<DepositCategory> listCategories() { return catRepo.findByTenantId(TenantContext.get().orElse(null)); }

    @Transactional
    public DepositCategory createCategory(DepositDto.CategoryRequest req) {
        DepositCategory c = DepositCategory.builder()
                .name(req.name())
                .description(req.description())
                .tenantId(TenantContext.require())
                .build();
        return catRepo.save(c);
    }

    @Transactional
    public DepositDto create(DepositDto.CreateRequest req, UUID userId) {
        UUID tenantId = TenantContext.require();
        Account account = accountRepo.findByIdForUpdate(req.accountId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found"));

        Deposit d = Deposit.builder()
                .ref(nextRef())
                .date(req.date() != null ? req.date() : LocalDate.now())
                .accountId(req.accountId())
                .categoryId(req.categoryId())
                .amount(req.amount())
                .currency(req.currency() != null ? req.currency() : account.getCurrency())
                .description(req.description())
                .notes(req.notes())
                .userId(userId)
                .tenantId(tenantId)
                .build();
        Deposit saved = depositRepo.save(d);

        BigDecimal newBalance = account.applyDelta(req.amount());
        accountRepo.save(account);

        ledgerRepo.save(LedgerEntry.builder()
                .accountId(account.getId()).txnDate(saved.getDate())
                .referenceType(ReferenceType.DEPOSIT).referenceId(saved.getId())
                .description("Deposit " + saved.getRef() + (saved.getDescription() == null ? "" : " — " + saved.getDescription()))
                .debit(req.amount()).credit(BigDecimal.ZERO)
                .balanceAfter(newBalance)
                .tenantId(tenantId)
                .build());

        outbox.publish("Deposit", saved.getId(), "DepositRecorded",
                java.util.Map.of("depositId", saved.getId(), "amount", saved.getAmount(),
                                 "accountId", saved.getAccountId()),
                tenantId);
        return DepositDto.from(saved);
    }

    private String nextRef() {
        String prefix = "DEP-" + Year.now().getValue() + "-";
        long n = depositRepo.countByRefStartingWithAndTenantId(prefix, TenantContext.require()) + 1;
        return prefix + String.format("%06d", n);
    }
}
