package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    List<ApiKey> findByTenantId(UUID tenantId);

    Optional<ApiKey> findByPrefix(String prefix);

    List<ApiKey> findByStatus(String status);
}
