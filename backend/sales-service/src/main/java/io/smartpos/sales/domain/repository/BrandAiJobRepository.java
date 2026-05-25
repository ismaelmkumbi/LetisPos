package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.BrandAiJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BrandAiJobRepository extends JpaRepository<BrandAiJob, UUID> {
    List<BrandAiJob> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<BrandAiJob> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status);
}
