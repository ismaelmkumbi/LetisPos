package io.smartpos.report.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.report.domain.model.ExportJob;
import io.smartpos.report.domain.repository.ExportJobRepository;
import io.smartpos.report.infrastructure.export.MinioObjectStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Orchestrates async export jobs.
 *
 * <p>Submission flow (called from {@link io.smartpos.report.api.ExportController}):
 * <ol>
 *   <li>{@link #submit} persists an {@link ExportJob} with status PENDING and
 *       enqueues an async render via {@link #render(UUID)}.</li>
 *   <li>The async worker (see {@link ExportWorker}) — or this method itself —
 *       transitions PENDING → RUNNING → READY/FAILED, uploads bytes to MinIO,
 *       and stores a presigned URL on the row.</li>
 *   <li>Clients poll {@link #get} to retrieve status and the download URL.</li>
 * </ol>
 *
 * <p>The render path is deliberately resilient: any thrown exception is caught,
 * logged, and recorded on the job row. We never let an export failure bubble up
 * past the worker.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportJobService {

    private final ExportJobRepository jobs;
    private final ExportService       exportService;
    private final MinioObjectStore    storage;
    private final ObjectMapper        objectMapper;

    /** Submits a new job and kicks off async rendering. Returns the persisted job. */
    @Transactional
    public ExportJob submit(String reportKey, ExportJob.Format format,
                            LocalDate from, LocalDate to,
                            UUID warehouseId, int limit, UUID userId) {
        Map<String, Object> params = new HashMap<>();
        params.put("dateFrom", from == null ? null : from.toString());
        params.put("dateTo",   to   == null ? null : to.toString());
        params.put("warehouseId", warehouseId == null ? null : warehouseId.toString());
        params.put("limit", limit);

        String paramsJson;
        try {
            paramsJson = objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not serialise export params");
        }

        ExportJob job = jobs.save(ExportJob.builder()
                .reportKey(reportKey)
                .format(format)
                .params(paramsJson)
                .userId(userId)
                .build());

        // Fire-and-forget — Spring proxies the @Async call so it runs on the
        // application's task executor instead of the request thread.
        render(job.getId());
        return job;
    }

    @Transactional(readOnly = true)
    public ExportJob get(UUID id) {
        return jobs.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Export job not found"));
    }

    /**
     * Renders a single job. Public + @Async so it can also be invoked by the
     * sweeper (catching jobs left PENDING after a service restart).
     *
     * <p>Self-contained transaction boundaries — each status update is its own
     * tx so observers polling /jobs/{id} can watch the state change.
     */
    @Async("exportTaskExecutor")
    public CompletableFuture<Void> render(UUID jobId) {
        ExportJob job = markRunning(jobId);
        if (job == null) return CompletableFuture.completedFuture(null);

        try {
            JsonNode p = objectMapper.readTree(job.getParams());
            LocalDate from = parseDate(p, "dateFrom", LocalDate.now().withDayOfMonth(1));
            LocalDate to   = parseDate(p, "dateTo",   LocalDate.now());
            UUID warehouseId = parseUuid(p, "warehouseId");
            int limit = p.path("limit").asInt(10);

            ExportService.RenderedExport rendered = exportService.run(
                    job.getReportKey(), job.getFormat(), from, to, warehouseId, limit);

            String key = "exports/" + LocalDate.now() + "/" + job.getId() + extension(job.getFormat());
            storage.upload(key, rendered.body(), rendered.contentType());
            String url = storage.presignedGetUrl(key);

            markReady(jobId, url, rendered.body().length);
            log.info("Export job {} READY ({} bytes, key={})", jobId, rendered.body().length, key);
        } catch (Exception e) {
            log.error("Export job {} FAILED: {}", jobId, e.getMessage(), e);
            markFailed(jobId, e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    // ---- state transitions (each its own tx) ----

    @Transactional
    protected ExportJob markRunning(UUID jobId) {
        Optional<ExportJob> opt = jobs.findById(jobId);
        if (opt.isEmpty()) {
            log.warn("Export job {} vanished before render", jobId);
            return null;
        }
        ExportJob job = opt.get();
        if (job.getStatus() == ExportJob.Status.READY) {
            // Already finished by another worker — nothing to do.
            return null;
        }
        job.setStatus(ExportJob.Status.RUNNING);
        return jobs.save(job);
    }

    @Transactional
    protected void markReady(UUID jobId, String url, long size) {
        jobs.findById(jobId).ifPresent(j -> {
            j.setStatus(ExportJob.Status.READY);
            j.setFileUrl(url);
            j.setFileSize(size);
            j.setCompletedAt(Instant.now());
            jobs.save(j);
        });
    }

    @Transactional
    protected void markFailed(UUID jobId, String error) {
        jobs.findById(jobId).ifPresent(j -> {
            j.setStatus(ExportJob.Status.FAILED);
            j.setError(truncate(error, 1000));
            j.setCompletedAt(Instant.now());
            jobs.save(j);
        });
    }

    // ---- helpers ----

    private static LocalDate parseDate(JsonNode n, String field, LocalDate fallback) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) return fallback;
        String s = v.asText();
        return s == null || s.isBlank() ? fallback : LocalDate.parse(s);
    }

    private static UUID parseUuid(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) return null;
        String s = v.asText();
        return s == null || s.isBlank() ? null : UUID.fromString(s);
    }

    private static String extension(ExportJob.Format f) {
        return switch (f) {
            case PDF  -> ".pdf";
            case XLSX -> ".xlsx";
            case CSV  -> ".csv";
        };
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
