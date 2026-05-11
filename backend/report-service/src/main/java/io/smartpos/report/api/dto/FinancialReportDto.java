package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record FinancialReportDto(
    BalanceSheet balanceSheet,
    TrialBalance trialBalance,
    CashFlowStatement cashFlow
) {
    public record BalanceSheet(List<AccountGroup> assets, List<AccountGroup> liabilities, List<AccountGroup> equity, BigDecimal totalAssets, BigDecimal totalLiabilitiesEquity) {}

    public record AccountGroup(String code, String name, BigDecimal balance, List<AccountGroup> children) {}

    public record TrialBalance(List<TrialBalanceRow> rows, BigDecimal totalDebits, BigDecimal totalCredits) {}

    public record TrialBalanceRow(String accountCode, String accountName, BigDecimal debit, BigDecimal credit) {}

    public record CashFlowStatement(BigDecimal operating, BigDecimal investing, BigDecimal financing, BigDecimal netChange, BigDecimal openingBalance, BigDecimal closingBalance) {}
}
