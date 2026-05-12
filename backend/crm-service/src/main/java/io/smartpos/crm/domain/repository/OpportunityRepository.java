package io.smartpos.crm.domain.repository;

import io.smartpos.crm.domain.model.Opportunity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OpportunityRepository extends JpaRepository<Opportunity, UUID> {

    Page<Opportunity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<Opportunity> findByTenantIdAndStage(UUID tenantId, String stage, Pageable pageable);
}
