package io.smartpos.payment.domain.model;

/**
 * Top-level grouping for a Chart-of-Accounts node.
 * Drives normal-balance defaults and where the account rolls up in the
 * Balance Sheet (assets/liabilities/equity) vs. P&amp;L (revenue/expense).
 */
public enum AccountClass {
    ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE;

    public boolean isBalanceSheet() {
        return this == ASSET || this == LIABILITY || this == EQUITY;
    }

    public boolean isProfitAndLoss() {
        return this == REVENUE || this == EXPENSE;
    }
}
