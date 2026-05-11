package io.smartpos.report.api.dto;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;

public record ScheduledReportDto(UUID id, String reportKey, String frequency, String cronExpression,
                                  String recipients, String format, boolean active,
                                  Instant lastRunAt, Instant nextRunAt, Instant createdAt) {
    public static ScheduledReportDto from(io.smartpos.report.domain.model.ScheduledReport s) {
        return new ScheduledReportDto(s.getId(), s.getReportKey(), s.getFrequency(),
            s.getCronExpression(), s.getRecipients(), s.getFormat(), s.isActive(),
            s.getLastRunAt(), s.getNextRunAt(), s.getCreatedAt());
    }
    public record CreateRequest(@NotBlank String reportKey, @NotBlank String frequency,
                                 String cronExpression, @NotBlank String recipients,
                                 String format, Boolean active) {}
}
