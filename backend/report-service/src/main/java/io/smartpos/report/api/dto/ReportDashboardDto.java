package io.smartpos.report.api.dto;
import io.smartpos.report.domain.model.ReportDashboard;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;

public record ReportDashboardDto(UUID id, String name, String layout, String filters,
                                  boolean shared, Instant createdAt, Instant updatedAt) {
    public static ReportDashboardDto from(ReportDashboard d) {
        return new ReportDashboardDto(d.getId(), d.getName(), d.getLayout(),
            d.getFilters(), d.isShared(), d.getCreatedAt(), d.getUpdatedAt());
    }
    public record CreateRequest(@NotBlank String name, String layout, String filters, Boolean shared) {}
}
