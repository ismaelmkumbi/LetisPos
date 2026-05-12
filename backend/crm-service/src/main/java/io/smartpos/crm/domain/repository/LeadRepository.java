package io.smartpos.crm.domain.repository;

import io.smartpos.crm.domain.model.Lead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID> {

    Page<Lead> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<Lead> findByTenantIdAndStatus(UUID tenantId, String status, Pageable pageable);
}
