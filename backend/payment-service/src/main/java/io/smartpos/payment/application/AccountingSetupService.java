package io.smartpos.payment.application;

import io.smartpos.payment.domain.model.*;
import io.smartpos.payment.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * One-shot per-tenant accounting initialization.
 *
 * Copies the global COA template (tenant_id=NULL) to a specific tenant,
 * creates default operational accounts linked to COA nodes, copies
 * auto-posting rules, and seeds default expense/deposit categories.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountingSetupService {

    private final ChartOfAccountRepository coaRepo;
    private final AccountRepository accountRepo;
    private final AutoPostingRuleRepository ruleRepo;
    private final ExpenseCategoryRepository expenseCatRepo;
    private final DepositCategoryRepository depositCatRepo;

    public record SetupResult(
            int coaEntries,
            int operationalAccounts,
            int postingRules,
            int expenseCategories,
            int depositCategories
    ) {}

    @Transactional
    public SetupResult initializeTenant(UUID tenantId) {
        int coaCount = copyChartOfAccounts(tenantId);
        int acctCount = createDefaultAccounts(tenantId);
        int ruleCount = copyPostingRules(tenantId);
        int expCatCount = seedExpenseCategories(tenantId);
        int depCatCount = seedDepositCategories(tenantId);

        log.info("Accounting setup complete for tenant {}: {} COA entries, {} accounts, {} rules, {} expense cats, {} deposit cats",
                tenantId, coaCount, acctCount, ruleCount, expCatCount, depCatCount);

        return new SetupResult(coaCount, acctCount, ruleCount, expCatCount, depCatCount);
    }

    private int copyChartOfAccounts(UUID tenantId) {
        List<ChartOfAccount> globalAccounts = coaRepo.findByTenantId(null);
        if (globalAccounts.isEmpty()) {
            globalAccounts = coaRepo.findByTenantId(null); // re-check
        }

        // Map old (global) IDs → new (tenant) IDs
        Map<UUID, UUID> idMap = new HashMap<>();
        List<ChartOfAccount> newAccounts = new ArrayList<>();

        // First pass: create all entries with new IDs
        for (ChartOfAccount global : globalAccounts) {
            UUID newId = UUID.randomUUID();
            idMap.put(global.getId(), newId);
            ChartOfAccount tenantCopy = ChartOfAccount.builder()
                    .id(newId)
                    .code(global.getCode())
                    .name(global.getName())
                    .accountClass(global.getAccountClass())
                    .normalBalance(global.getNormalBalance())
                    .postable(global.isPostable())
                    .active(global.isActive())
                    .description(global.getDescription())
                    .tenantId(tenantId)
                    .build();
            newAccounts.add(tenantCopy);
        }

        // Second pass: wire up parent_id using id map
        for (int i = 0; i < globalAccounts.size(); i++) {
            ChartOfAccount global = globalAccounts.get(i);
            if (global.getParentId() != null) {
                UUID newParentId = idMap.get(global.getParentId());
                if (newParentId != null) {
                    newAccounts.get(i).setParentId(newParentId);
                }
            }
        }

        coaRepo.saveAll(newAccounts);
        return newAccounts.size();
    }

    private int createDefaultAccounts(UUID tenantId) {
        // Check if the tenant already has operational accounts
        if (!accountRepo.findByTenantId(tenantId).isEmpty()) {
            return 0;
        }

        List<Account> accounts = new ArrayList<>();

        // Cash → COA code 1100
        coaRepo.findByCodeAndTenantId("1100", tenantId).ifPresent(coa ->
                accounts.add(Account.builder()
                        .name("Cash")
                        .type(AccountType.CASH)
                        .currency("TZS")
                        .coaId(coa.getId())
                        .active(true)
                        .tenantId(tenantId)
                        .build()));

        // Bank → COA code 1110
        coaRepo.findByCodeAndTenantId("1110", tenantId).ifPresent(coa ->
                accounts.add(Account.builder()
                        .name("Bank")
                        .type(AccountType.BANK)
                        .currency("TZS")
                        .coaId(coa.getId())
                        .active(true)
                        .tenantId(tenantId)
                        .build()));

        // M-Pesa → COA code 1120
        coaRepo.findByCodeAndTenantId("1120", tenantId).ifPresent(coa ->
                accounts.add(Account.builder()
                        .name("M-Pesa")
                        .type(AccountType.MOBILE_MONEY)
                        .currency("TZS")
                        .coaId(coa.getId())
                        .active(true)
                        .tenantId(tenantId)
                        .build()));

        if (!accounts.isEmpty()) {
            accountRepo.saveAll(accounts);
        }
        return accounts.size();
    }

    private int copyPostingRules(UUID tenantId) {
        // Check if tenant already has rules
        List<AutoPostingRule> globalRules = ruleRepo.findByReferenceTypeWithFallback(
                ReferenceType.SALE, null);
        // Actually we need a proper query — check if any tenant-level rules exist
        if (!ruleRepo.findAll().stream().anyMatch(r -> tenantId.equals(r.getTenantId()))) {
            List<AutoPostingRule> newRules = new ArrayList<>();
            // Copy global rules to tenant, overriding to tenant-specific COA codes
            List<AutoPostingRule> allGlobal = ruleRepo.findAll().stream()
                    .filter(r -> r.getTenantId() == null)
                    .toList();

            for (AutoPostingRule global : allGlobal) {
                // Look up tenant-specific COA: find the tenant COA entry with the same code
                ChartOfAccount globalCoa = coaRepo.findById(global.getCoaId()).orElse(null);
                if (globalCoa == null) continue;

                coaRepo.findByCodeAndTenantId(globalCoa.getCode(), tenantId).ifPresent(tenantCoa -> {
                    newRules.add(AutoPostingRule.builder()
                            .tenantId(tenantId)
                            .referenceType(global.getReferenceType())
                            .coaId(tenantCoa.getId())
                            .build());
                });
            }
            if (!newRules.isEmpty()) {
                ruleRepo.saveAll(newRules);
            }
            return newRules.size();
        }
        return 0;
    }

    private int seedExpenseCategories(UUID tenantId) {
        if (!expenseCatRepo.findByTenantId(tenantId).isEmpty()) return 0;

        List<ExpenseCategory> cats = new ArrayList<>();
        cats.add(category("General Expenses", "Miscellaneous operating expenses", "5200", tenantId));
        cats.add(category("Salaries & Wages", "Staff salaries, wages, and benefits", "5300", tenantId));
        cats.add(category("Rent & Utilities", "Office rent, electricity, water, internet", "5400", tenantId));
        cats.add(category("Office Supplies", "Stationery, printing, and office consumables", "5500", tenantId));
        cats.add(category("Marketing & Advertising", "Promotions, ads, and marketing campaigns", "5600", tenantId));
        cats.add(category("Transport & Logistics", "Delivery, fuel, and transport costs", "5700", tenantId));
        cats.add(category("Repairs & Maintenance", "Equipment and facility repairs", "5800", tenantId));

        expenseCatRepo.saveAll(cats);
        return cats.size();
    }

    private int seedDepositCategories(UUID tenantId) {
        if (!depositCatRepo.findByTenantId(tenantId).isEmpty()) return 0;

        List<DepositCategory> cats = new ArrayList<>();
        cats.add(depCategory("Sales Deposit", "Daily sales proceeds deposited", "4100", tenantId));
        cats.add(depCategory("Owner Contribution", "Capital introduced by the owner", "3100", tenantId));
        cats.add(depCategory("Other Income", "Miscellaneous income and receipts", "4300", tenantId));

        depositCatRepo.saveAll(cats);
        return cats.size();
    }

    private ExpenseCategory category(String name, String desc, String coaCode, UUID tenantId) {
        ExpenseCategory.ExpenseCategoryBuilder b = ExpenseCategory.builder()
                .name(name).description(desc).tenantId(tenantId);
        coaRepo.findByCodeAndTenantId(coaCode, tenantId)
                .ifPresent(coa -> b.coaId(coa.getId()));
        return b.build();
    }

    private DepositCategory depCategory(String name, String desc, String coaCode, UUID tenantId) {
        DepositCategory.DepositCategoryBuilder b = DepositCategory.builder()
                .name(name).description(desc).tenantId(tenantId);
        coaRepo.findByCodeAndTenantId(coaCode, tenantId)
                .ifPresent(coa -> b.coaId(coa.getId()));
        return b.build();
    }
}
