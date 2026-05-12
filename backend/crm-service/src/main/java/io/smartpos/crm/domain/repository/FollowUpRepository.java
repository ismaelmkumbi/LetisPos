package io.smartpos.crm.domain.repository;

import io.smartpos.crm.domain.model.FollowUp;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FollowUpRepository extends JpaRepository<FollowUp, UUID> {

    Page<FollowUp> findByTenantIdOrderByDueDateAsc(UUID tenantId, Pageable pageable);

    Page<FollowUp> findByTenantIdAndStatus(UUID tenantId, String status, Pageable pageable);
}
