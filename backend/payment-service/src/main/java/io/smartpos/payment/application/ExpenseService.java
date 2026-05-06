package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.ExpenseDto;
import io.smartpos.payment.domain.model.*;
import io.smartpos.payment.domain.repository.AccountRepository;
import io.smartpos.payment.domain.repository.ExpenseCategoryRepository;
import io.smartpos.payment.domain.repository.ExpenseRepository;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository         expenseRepo;
    private final ExpenseCategoryRepository catRepo;
    private final AccountRepository         accountRepo;
    private final LedgerRepository          ledgerRepo;
    private final OutboxPublisher           outbox;

    @Transactional(readOnly = true)
    public Page<ExpenseDto> search(UUID accountId, UUID categoryId,
                                   LocalDate from, LocalDate to, Pageable p) {
        return expenseRepo.search(accountId, categoryId, from, to, TenantContext.require(), p).map(ExpenseDto::from);
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategory> listCategories() { return catRepo.findByTenantId(TenantContext.require()); }

    @Transactional
    public ExpenseCategory createCategory(ExpenseDto.CategoryRequest req) {
        ExpenseCategory c = ExpenseCategory.builder()
                .name(req.name())
                .description(req.description())
                .tenantId(TenantContext.require())
                .build();
        return catRepo.save(c);
    }

    @Transactional
    public ExpenseDto create(ExpenseDto.CreateRequest req, UUID userId) {
        UUID tenantId = TenantContext.require();
        Account account = accountRepo.findByIdForUpdate(req.accountId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found"));

        Expense e = Expense.builder()
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
        Expense saved = expenseRepo.save(e);

        BigDecimal newBalance = account.applyDelta(req.amount().negate());
        accountRepo.save(account);

        ledgerRepo.save(LedgerEntry.builder()
                .accountId(account.getId()).txnDate(saved.getDate())
                .referenceType(ReferenceType.EXPENSE).referenceId(saved.getId())
                .description("Expense " + saved.getRef() + (saved.getDescription() == null ? "" : " — " + saved.getDescription()))
                .debit(BigDecimal.ZERO).credit(req.amount())
                .balanceAfter(newBalance)
                .tenantId(tenantId)
                .build());

        outbox.publish("Expense", saved.getId(), "ExpenseRecorded",
                java.util.Map.of("expenseId", saved.getId(), "amount", saved.getAmount(),
                                 "accountId", saved.getAccountId()),
                tenantId);
        return ExpenseDto.from(saved);
    }

    private String nextRef() {
        String prefix = "EXP-" + Year.now().getValue() + "-";
        long n = expenseRepo.countByRefStartingWithAndTenantId(prefix, TenantContext.require()) + 1;
        return prefix + String.format("%06d", n);
    }
}
