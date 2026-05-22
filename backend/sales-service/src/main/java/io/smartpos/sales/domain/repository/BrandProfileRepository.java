package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.BrandProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface BrandProfileRepository extends JpaRepository<BrandProfile, UUID> {
    Optional<BrandProfile> findByTenantId(UUID tenantId);
}
