package io.smartpos.crm.domain.repository;

import io.smartpos.crm.domain.model.Activity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {

    Page<Activity> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<Activity> findByTenantIdAndType(UUID tenantId, String type, Pageable pageable);
}
