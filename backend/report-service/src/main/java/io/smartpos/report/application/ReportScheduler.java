package io.smartpos.report.application;

import io.smartpos.report.domain.model.ScheduledReport;
import io.smartpos.report.domain.repository.ScheduledReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Periodically processes {@link ScheduledReport} entities that have a
 * {@code nextRunAt} timestamp in the past and are still active.
 *
 * <p>In the current iteration the scheduler only advances the schedule
 * timestamps.  A future iteration will:
 * <ol>
 *   <li>Run the report via {@link ExportService#run}</li>
 *   <li>Render as a branded PDF via {@link ExportService#renderReportPdf}</li>
 *   <li>Deliver to recipients via the notification-service</li>
 * </ol>
 *
 * <p>The scheduler fires every 15 minutes (fixed-rate, not overlapping).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReportScheduler {

    private final ScheduledReportRepository scheduledReportRepo;
    private final ExportService exportService;

    /**
     * Runs every 15 minutes to check for scheduled reports due for delivery.
     */
    @Scheduled(fixedRate = 900_000) // 15 minutes
    public void processScheduledReports() {
        Instant now = Instant.now();

        List<ScheduledReport> due = scheduledReportRepo.findAll().stream()
                .filter(ScheduledReport::isActive)
                .filter(s -> s.getNextRunAt() != null && s.getNextRunAt().isBefore(now))
                .toList();

        if (due.isEmpty()) {
            log.debug("No scheduled reports due at {}", now);
            return;
        }

        log.info("Processing {} scheduled report(s) at {}", due.size(), now);

        for (ScheduledReport schedule : due) {
            try {
                log.info("Processing scheduled report: reportKey={} tenantId={} frequency={}",
                        schedule.getReportKey(), schedule.getTenantId(), schedule.getFrequency());

                // TODO: Run report, render branded PDF via document-service,
                //       and email/WhatsApp to recipients via notification-service.

                schedule.setLastRunAt(now);
                schedule.setNextRunAt(calculateNextRun(schedule.getFrequency(), now));
                scheduledReportRepo.save(schedule);

                log.info("Scheduled report {} advanced to nextRunAt={}",
                        schedule.getId(), schedule.getNextRunAt());
            } catch (Exception e) {
                log.error("Failed to process scheduled report id={} tenantId={}: {}",
                        schedule.getId(), schedule.getTenantId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Compute the next run instant based on the schedule frequency.
     */
    private Instant calculateNextRun(String frequency, Instant from) {
        return switch (frequency != null ? frequency.toUpperCase() : "DAILY") {
            case "DAILY"   -> from.plus(Duration.ofDays(1));
            case "WEEKLY"  -> from.plus(Duration.ofDays(7));
            case "MONTHLY" -> from.plus(Duration.ofDays(30));
            default -> {
                log.warn("Unknown frequency '{}', defaulting to DAILY", frequency);
                yield from.plus(Duration.ofDays(1));
            }
        };
    }
}
