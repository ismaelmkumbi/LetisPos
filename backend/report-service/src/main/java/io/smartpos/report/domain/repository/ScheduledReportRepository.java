package io.smartpos.report.domain.repository;
import io.smartpos.report.domain.model.ScheduledReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ScheduledReportRepository extends JpaRepository<ScheduledReport, UUID> {
    List<ScheduledReport> findByTenantIdAndActiveTrue(UUID tenantId);
}
