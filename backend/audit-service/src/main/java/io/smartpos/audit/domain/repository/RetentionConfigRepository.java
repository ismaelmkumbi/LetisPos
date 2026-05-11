package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.RetentionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RetentionConfigRepository extends JpaRepository<RetentionConfig, UUID> {

    Optional<RetentionConfig> findByTenantId(UUID tenantId);
}
