package io.smartpos.payment.application;

import io.smartpos.payment.domain.model.*;
import io.smartpos.payment.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Bridges operational transactions (payments, expenses, deposits, transfers)
 * to the General Ledger by auto-creating balanced, immediately-posted journal
 * entries.
 *
 * Every public method is best-effort: callers wrap in try-catch so a missing
 * COA configuration never blocks the business transaction.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AutoPostingService {

    private final JournalEntryRepository journalRepo;
    private final ChartOfAccountRepository coaRepo;
    private final AutoPostingRuleRepository ruleRepo;
    private final ExpenseCategoryRepository expenseCatRepo;
    private final DepositCategoryRepository depositCatRepo;

    // ----------------------------------------------------------------
    // Payment → journal
    // ----------------------------------------------------------------

    @Transactional
    public void postPayment(Payment payment, Account account) {
        UUID tenantId = payment.getTenantId();
        UUID accountCoaId = requireCoa(account, "Account " + account.getName());
        boolean incoming = payment.getReferenceType().incomingForAccount();

        UUID counterCoaId = resolveRuleCounterpart(payment.getReferenceType(), tenantId);
        ChartOfAccount counterCoa = requireCoa(counterCoaId, "Posting rule for " + payment.getReferenceType());

        BigDecimal amount = payment.getAmount();
        JournalEntryLine operationalLine = incoming
                ? drLine(accountCoaId, amount, 0)
                : crLine(accountCoaId, amount, 0);
        JournalEntryLine counterLine = incoming
                ? crLine(counterCoaId, amount, 1)
                : drLine(counterCoaId, amount, 1);

        JournalEntry je = buildEntry(
                mapSource(payment.getReferenceType()),
                payment.getId().toString(),
                "Auto: " + payment.getRef(),
                tenantId,
                List.of(operationalLine, counterLine));
        postAndSave(je);
    }

    // ----------------------------------------------------------------
    // Expense → journal
    // ----------------------------------------------------------------

    @Transactional
    public void postExpense(Expense expense, Account account) {
        UUID tenantId = expense.getTenantId();
        UUID accountCoaId = requireCoa(account, "Account " + account.getName());
        UUID counterCoaId = resolveExpenseCounterpart(expense.getCategoryId(), tenantId);
        ChartOfAccount counterCoa = requireCoa(counterCoaId, "Expense category or posting rule");

        BigDecimal amount = expense.getAmount();
        JournalEntryLine operationalLine = crLine(accountCoaId, amount, 0);
        JournalEntryLine counterLine = drLine(counterCoaId, amount, 1);

        JournalEntry je = buildEntry(
                "EXPENSE",
                expense.getId().toString(),
                "Auto: " + expense.getRef(),
                tenantId,
                List.of(operationalLine, counterLine));
        postAndSave(je);
    }

    // ----------------------------------------------------------------
    // Deposit → journal
    // ----------------------------------------------------------------

    @Transactional
    public void postDeposit(Deposit deposit, Account account) {
        UUID tenantId = deposit.getTenantId();
        UUID accountCoaId = requireCoa(account, "Account " + account.getName());
        UUID counterCoaId = resolveDepositCounterpart(deposit.getCategoryId(), tenantId);
        ChartOfAccount counterCoa = requireCoa(counterCoaId, "Deposit category or posting rule");

        BigDecimal amount = deposit.getAmount();
        JournalEntryLine operationalLine = drLine(accountCoaId, amount, 0);
        JournalEntryLine counterLine = crLine(counterCoaId, amount, 1);

        JournalEntry je = buildEntry(
                "DEPOSIT",
                deposit.getId().toString(),
                "Auto: " + deposit.getRef(),
                tenantId,
                List.of(operationalLine, counterLine));
        postAndSave(je);
    }

    // ----------------------------------------------------------------
    // Transfer → journal
    // ----------------------------------------------------------------

    @Transactional
    public void postTransfer(AccountTransfer transfer, Account fromAccount, Account toAccount) {
        UUID tenantId = transfer.getTenantId();
        UUID fromCoaId = requireCoa(fromAccount, "From-account " + fromAccount.getName());
        UUID toCoaId   = requireCoa(toAccount,   "To-account "   + toAccount.getName());

        BigDecimal amount = transfer.getAmount();
        JournalEntryLine fromLine = crLine(fromCoaId, amount, 0);
        JournalEntryLine toLine   = drLine(toCoaId,   amount, 1);

        JournalEntry je = buildEntry(
                "ADJUSTMENT",
                transfer.getId().toString(),
                "Auto: " + transfer.getRef(),
                tenantId,
                List.of(fromLine, toLine));
        postAndSave(je);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private UUID resolveRuleCounterpart(ReferenceType refType, UUID tenantId) {
        List<AutoPostingRule> rules = ruleRepo.findByReferenceTypeWithFallback(refType, tenantId);
        if (rules.isEmpty()) {
            throw new IllegalStateException(
                    "No auto-posting rule for " + refType + " (tenant=" + tenantId + "). "
                    + "Configure one in auto_posting_rules.");
        }
        return rules.get(0).getCoaId();
    }

    private UUID resolveExpenseCounterpart(UUID categoryId, UUID tenantId) {
        if (categoryId != null) {
            Optional<ExpenseCategory> cat = expenseCatRepo.findById(categoryId);
            if (cat.isPresent() && cat.get().getCoaId() != null) {
                return cat.get().getCoaId();
            }
        }
        return resolveRuleCounterpart(ReferenceType.EXPENSE, tenantId);
    }

    private UUID resolveDepositCounterpart(UUID categoryId, UUID tenantId) {
        if (categoryId != null) {
            Optional<DepositCategory> cat = depositCatRepo.findById(categoryId);
            if (cat.isPresent() && cat.get().getCoaId() != null) {
                return cat.get().getCoaId();
            }
        }
        return resolveRuleCounterpart(ReferenceType.DEPOSIT, tenantId);
    }

    private UUID requireCoa(Account account, String label) {
        if (account.getCoaId() == null) {
            throw new IllegalStateException(
                    label + " is not linked to a Chart of Accounts node. Link it in account settings.");
        }
        return account.getCoaId();
    }

    private ChartOfAccount requireCoa(UUID coaId, String label) {
        return coaRepo.findById(coaId)
                .orElseThrow(() -> new IllegalStateException(
                        label + " references non-existent COA id " + coaId));
    }

    private String mapSource(ReferenceType rt) {
        return switch (rt) {
            case SALE            -> "SALE";
            case PURCHASE        -> "PURCHASE";
            case SALE_RETURN     -> "SALE";
            case PURCHASE_RETURN -> "PURCHASE";
            case EXPENSE         -> "EXPENSE";
            case DEPOSIT         -> "DEPOSIT";
            case TRANSFER        -> "ADJUSTMENT";
        };
    }

    private JournalEntryLine drLine(UUID coaId, BigDecimal amount, int position) {
        return JournalEntryLine.builder()
                .accountId(coaId)
                .debit(amount).credit(BigDecimal.ZERO)
                .position(position)
                .build();
    }

    private JournalEntryLine crLine(UUID coaId, BigDecimal amount, int position) {
        return JournalEntryLine.builder()
                .accountId(coaId)
                .debit(BigDecimal.ZERO).credit(amount)
                .position(position)
                .build();
    }

    private JournalEntry buildEntry(String source, String sourceRef, String memo,
                                     UUID tenantId, List<JournalEntryLine> lines) {
        return JournalEntry.builder()
                .ref(nextAutoRef(tenantId))
                .entryDate(java.time.LocalDate.now())
                .memo(memo)
                .source(source)
                .sourceRef(sourceRef)
                .status(JournalStatus.DRAFT)
                .tenantId(tenantId)
                .lines(lines)
                .build();
    }

    private void postAndSave(JournalEntry je) {
        je.setStatus(JournalStatus.POSTED);
        je.setPostedAt(Instant.now());
        journalRepo.save(je);
    }

    private String nextAutoRef(UUID tenantId) {
        String prefix = "AUTO-" + Year.now().getValue() + "-";
        long n = journalRepo.countByRefStartingWithAndTenantId(prefix, tenantId) + 1;
        return prefix + String.format("%06d", n);
    }
}
