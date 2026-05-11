package io.smartpos.report.domain.repository;
import io.smartpos.report.domain.model.ReportDashboard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface ReportDashboardRepository extends JpaRepository<ReportDashboard, UUID> {
    List<ReportDashboard> findByTenantIdOrderByUpdatedAtDesc(UUID tenantId);
}
