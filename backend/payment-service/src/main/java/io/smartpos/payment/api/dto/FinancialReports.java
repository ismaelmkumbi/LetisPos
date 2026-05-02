package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.AccountClass;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTOs for the three core financial statements. Each report is a flat list
 * of rows + a totals object — frontends typically render them as collapsible
 * sections grouped by {@code accountClass}.
 */
public final class FinancialReports {

    private FinancialReports() {}

    public record TrialBalance(LocalDate from, LocalDate to, List<Row> rows,
                               BigDecimal totalDebit, BigDecimal totalCredit) {
        public record Row(UUID accountId, String code, String name, AccountClass accountClass,
                          BigDecimal debit, BigDecimal credit) {}
    }

    public record ProfitAndLoss(LocalDate from, LocalDate to,
                                List<Line> revenue, List<Line> expenses,
                                BigDecimal totalRevenue, BigDecimal totalExpense, BigDecimal netIncome) {
        public record Line(UUID accountId, String code, String name, BigDecimal amount) {}
    }

    public record BalanceSheet(LocalDate asOf,
                               List<Section> assets, List<Section> liabilities, List<Section> equity,
                               BigDecimal totalAssets, BigDecimal totalLiabilities,
                               BigDecimal totalEquity, BigDecimal retainedEarnings) {
        public record Section(UUID accountId, String code, String name, BigDecimal balance) {}
    }
}
