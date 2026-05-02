package io.smartpos.report.api.dto;

import io.smartpos.report.domain.model.ExportJob;

import java.time.Instant;
import java.util.UUID;

/**
 * Wire shape for {@code GET /export/jobs/{id}} and the response of
 * {@code POST /export/jobs}. Hides the {@code params} JSON column —
 * callers don't need it back, they sent it.
 */
public record ExportJobDto(
        UUID id,
        String reportKey,
        ExportJob.Format format,
        ExportJob.Status status,
        String fileUrl,
        Long fileSize,
        String error,
        Instant createdAt,
        Instant completedAt
) {
    public static ExportJobDto from(ExportJob j) {
        return new ExportJobDto(
                j.getId(),
                j.getReportKey(),
                j.getFormat(),
                j.getStatus(),
                j.getFileUrl(),
                j.getFileSize(),
                j.getError(),
                j.getCreatedAt(),
                j.getCompletedAt()
        );
    }
}
