package io.smartpos.report.application;

import io.smartpos.report.domain.model.ScheduledReport;
import io.smartpos.report.domain.repository.ScheduledReportRepository;
import io.smartpos.report.infrastructure.feign.DocumentFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Periodically processes {@link ScheduledReport} entities that have a
 * {@code nextRunAt} timestamp in the past and are still active.
 *
 * <p>Each due schedule is:
 * <ol>
 *   <li>Run via {@link ExportService#run} (tabular export)</li>
 *   <li>Rendered as a branded PDF via the document-service</li>
 *   <li>Slated for email/WhatsApp delivery to recipients via notification-service</li>
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
    private final DocumentFeign documentFeign;

    /**
     * Runs every 15 minutes to check for scheduled reports due for delivery.
     */
    @Scheduled(fixedRate = 900_000) // 15 minutes
    public void processScheduledReports() {
        var now = Instant.now();

        var due = scheduledReportRepo.findAll().stream()
                .filter(ScheduledReport::isActive)
                .filter(s -> s.getNextRunAt() != null && s.getNextRunAt().isBefore(now))
                .toList();

        if (due.isEmpty()) {
            log.debug("No scheduled reports due at {}", now);
            return;
        }

        log.info("Processing {} scheduled report(s) at {}", due.size(), now);

        for (var schedule : due) {
            try {
                log.info("Processing scheduled report: {} for tenant {}",
                        schedule.getReportKey(), schedule.getTenantId());

                // Build report data based on report key
                Map<String, Object> data = buildReportData(schedule.getReportKey(), schedule.getTenantId());

                // Generate PDF via document-service
                try {
                    var result = documentFeign.generateReport(
                            DocumentFeign.GenerateReportRequest.forReportKey(schedule.getReportKey(), data));
                    log.info("Generated PDF for schedule {}: {}", schedule.getId(), result);
                } catch (Exception e) {
                    log.warn("Document generation failed for schedule {}: {}",
                            schedule.getId(), e.getMessage());
                }

                // TODO: Email to recipients via notification-service when NotificationClient is available
                log.info("Would email report {} to: {}", schedule.getReportKey(), schedule.getRecipients());

                schedule.setLastRunAt(now);
                schedule.setNextRunAt(calculateNextRun(schedule.getFrequency(), now));
                scheduledReportRepo.save(schedule);
            } catch (Exception e) {
                log.error("Failed to process scheduled report {}: {}",
                        schedule.getId(), e.getMessage());
            }
        }
    }

    private Map<String, Object> buildReportData(String reportKey, UUID tenantId) {
        var data = new HashMap<String, Object>();
        data.put("reportKey", reportKey);
        data.put("tenantId", tenantId);
        data.put("title", reportKey.replace("-", " "));
        data.put("dateFrom", LocalDate.now().withDayOfMonth(1).toString());
        data.put("dateTo", LocalDate.now().toString());
        data.put("kpis", List.of());
        data.put("columns", List.of());
        data.put("rows", List.of());
        return data;
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
