package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import io.smartpos.ai.api.dto.IntentClassification.ResolvedTime.TimeType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins time-expression resolution. The bug we fixed: "last month" used
 * to map to LAST_30_DAYS (a rolling window), so on May 25 it meant
 * Apr 25–May 25 instead of Apr 1–Apr 30. Tanzanian merchants saying
 * "mwezi uliopita" mean the calendar month.
 */
class TimeResolutionTest {

    private final IntentClassifierService classifier = new IntentClassifierService();

    @Test
    void lastMonthIsCalendarLastMonth() {
        IntentClassification intent = classifier.classify("sales last month");
        IntentClassification.ResolvedTime t = intent.time();
        assertThat(t.type()).isEqualTo(TimeType.LAST_MONTH);

        LocalDate today = LocalDate.now();
        LocalDate firstOfLast = today.minusMonths(1).withDayOfMonth(1);
        LocalDate lastOfLast = firstOfLast.withDayOfMonth(firstOfLast.lengthOfMonth());

        assertThat(t.dateFrom()).isEqualTo(firstOfLast.toString());
        assertThat(t.dateTo()).isEqualTo(lastOfLast.toString());
    }

    @Test
    void swahiliMweziUliopitaIsCalendarLastMonth() {
        IntentClassification intent = classifier.classify("mauzo mwezi uliopita");
        assertThat(intent.time().type()).isEqualTo(TimeType.LAST_MONTH);
    }

    @Test
    void last30DaysIsRollingWindow() {
        IntentClassification intent = classifier.classify("sales last 30 days");
        IntentClassification.ResolvedTime t = intent.time();
        assertThat(t.type()).isEqualTo(TimeType.LAST_30_DAYS);
        LocalDate today = LocalDate.now();
        assertThat(t.dateTo()).isEqualTo(today.toString());
        assertThat(t.dateFrom()).isEqualTo(today.minusDays(30).toString());
    }

    @Test
    void thisMonthStartsOnTheFirst() {
        IntentClassification intent = classifier.classify("revenue this month");
        IntentClassification.ResolvedTime t = intent.time();
        assertThat(t.type()).isEqualTo(TimeType.THIS_MONTH);
        LocalDate today = LocalDate.now();
        assertThat(t.dateFrom()).isEqualTo(today.withDayOfMonth(1).toString());
    }

    @Test
    void lastWeekIsCalendarMondayToSunday() {
        IntentClassification intent = classifier.classify("show me last week sales");
        IntentClassification.ResolvedTime t = intent.time();
        assertThat(t.type()).isEqualTo(TimeType.LAST_WEEK);
        LocalDate today = LocalDate.now();
        LocalDate expectedMon = today.with(java.time.DayOfWeek.MONDAY).minusWeeks(1);
        assertThat(t.dateFrom()).isEqualTo(expectedMon.toString());
        assertThat(t.dateTo()).isEqualTo(expectedMon.plusDays(6).toString());
    }
}
