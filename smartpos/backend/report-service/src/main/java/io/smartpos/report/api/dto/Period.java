package io.smartpos.report.api.dto;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/** Preset date ranges for dashboard queries. */
public enum Period {
    TODAY, YESTERDAY, WEEK, MONTH, YTD, LAST_30_DAYS;

    public LocalDate from(LocalDate today) {
        return switch (this) {
            case TODAY        -> today;
            case YESTERDAY    -> today.minusDays(1);
            case WEEK         -> today.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            case MONTH        -> today.withDayOfMonth(1);
            case YTD          -> today.withDayOfYear(1);
            case LAST_30_DAYS -> today.minusDays(30);
        };
    }

    public LocalDate to(LocalDate today) {
        return switch (this) {
            case YESTERDAY -> today.minusDays(1);
            default        -> today;
        };
    }
}
