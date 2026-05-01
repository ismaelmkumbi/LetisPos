package io.smartpos.sales.domain.model;

import java.time.LocalDate;

/**
 * Cadence used by recurring invoices. {@link #advance} returns the next
 * fire date given the previous run date and the multiplier.
 */
public enum RecurringFrequency {
    DAILY, WEEKLY, MONTHLY, YEARLY;

    public LocalDate advance(LocalDate from, int intervalCount) {
        int n = Math.max(1, intervalCount);
        return switch (this) {
            case DAILY   -> from.plusDays(n);
            case WEEKLY  -> from.plusWeeks(n);
            case MONTHLY -> from.plusMonths(n);
            case YEARLY  -> from.plusYears(n);
        };
    }
}
