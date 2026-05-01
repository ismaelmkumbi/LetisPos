package io.smartpos.report.application;

import io.smartpos.report.domain.model.ExportJob;
import io.smartpos.report.domain.repository.ExportJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Restart-safe sweeper for export jobs.
 *
 * <p>The "happy path" runs entirely inside {@link ExportJobService#submit} —
 * the request thread persists PENDING and immediately fires the @Async render.
 * If the JVM dies between persist and render, however, that PENDING row would
 * sit forever. This sweeper picks up such orphans every 30s.
 *
 * <p>It also catches PENDING jobs created from other replicas in a multi-pod
 * deployment when the originator's executor is saturated.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExportWorker {

    private final ExportJobRepository jobs;
    private final ExportJobService    jobService;

    @Scheduled(fixedDelayString = "${smartpos.report.export.sweep-ms:30000}")
    @Transactional(readOnly = true)
    public void sweepPending() {
        List<ExportJob> pending = jobs.findFirst10ByStatusOrderByCreatedAtAsc(ExportJob.Status.PENDING);
        if (pending.isEmpty()) return;
        log.info("Sweeping {} pending export job(s)", pending.size());
        for (ExportJob job : pending) {
            jobService.render(job.getId());
        }
    }
}
