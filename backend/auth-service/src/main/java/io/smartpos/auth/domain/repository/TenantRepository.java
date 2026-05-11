package io.smartpos.auth.domain.repository;

import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    Optional<Tenant> findBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    List<Tenant> findByStatusAndTrialEndsAtBefore(TenantStatus status, Instant before);

    List<Tenant> findByStatusAndStatusChangedAtBefore(TenantStatus status, Instant before);
}
