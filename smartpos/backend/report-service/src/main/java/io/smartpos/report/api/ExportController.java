package io.smartpos.report.api;

import io.smartpos.report.api.dto.ExportJobDto;
import io.smartpos.report.application.ExportJobService;
import io.smartpos.report.application.ExportService;
import io.smartpos.report.domain.model.ExportJob;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService    exports;
    private final ExportJobService jobService;

    /**
     * <strong>Legacy synchronous export.</strong> Kept for small datasets and
     * automation that doesn't want to poll. Renders inline, returns the bytes.
     *
     * <p>Prefer the async {@code POST /jobs} endpoint for any export that may
     * exceed a few MB or a few seconds.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('report.export')")
    public ResponseEntity<byte[]> export(@RequestParam String reportKey,
                                         @RequestParam ExportJob.Format format,
                                         @RequestParam(required = false) LocalDate dateFrom,
                                         @RequestParam(required = false) LocalDate dateTo,
                                         @RequestParam(required = false) UUID warehouseId,
                                         @RequestParam(defaultValue = "10") int limit) {
        LocalDate from = dateFrom != null ? dateFrom : LocalDate.now().withDayOfMonth(1);
        LocalDate to   = dateTo   != null ? dateTo   : LocalDate.now();

        ExportService.RenderedExport r = exports.run(reportKey, format, from, to, warehouseId, limit);

        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType(r.contentType()));
        h.setContentDisposition(ContentDisposition.attachment().filename(r.filename()).build());
        return ResponseEntity.ok().headers(h).body(r.body());
    }

    // ============================================================
    // Async export jobs (Phase 6c)
    // ============================================================

    /**
     * Enqueue an async export. Returns immediately with a jobId — clients poll
     * {@link #getJob} until {@code status = READY}, then download from
     * {@code fileUrl} (a MinIO presigned URL with a short TTL).
     */
    @PostMapping("/jobs")
    @PreAuthorize("hasAuthority('report.export')")
    public ExportJobDto submitJob(@RequestParam String reportKey,
                                  @RequestParam ExportJob.Format format,
                                  @RequestParam(required = false) LocalDate dateFrom,
                                  @RequestParam(required = false) LocalDate dateTo,
                                  @RequestParam(required = false) UUID warehouseId,
                                  @RequestParam(defaultValue = "10") int limit,
                                  @AuthenticationPrincipal Jwt jwt) {
        LocalDate from = dateFrom != null ? dateFrom : LocalDate.now().withDayOfMonth(1);
        LocalDate to   = dateTo   != null ? dateTo   : LocalDate.now();

        UUID userId = jwtSubject(jwt);
        ExportJob job = jobService.submit(reportKey, format, from, to, warehouseId, limit, userId);
        return ExportJobDto.from(job);
    }

    /** Status + presigned download URL when ready. */
    @GetMapping("/jobs/{id}")
    @PreAuthorize("hasAuthority('report.export')")
    public ExportJobDto getJob(@PathVariable UUID id) {
        return ExportJobDto.from(jobService.get(id));
    }

    private static UUID jwtSubject(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); }
        catch (Exception e) { return null; }
    }
}
