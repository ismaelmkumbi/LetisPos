package io.smartpos.integration.domain.repository;

import io.smartpos.integration.domain.model.IntegrationConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IntegrationConfigRepository extends JpaRepository<IntegrationConfig, UUID> {

    List<IntegrationConfig> findByTenantId(UUID tenantId);

    Optional<IntegrationConfig> findByTenantIdAndProvider(UUID tenantId, String provider);
}
