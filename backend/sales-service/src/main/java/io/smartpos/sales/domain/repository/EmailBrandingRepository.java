package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.EmailBranding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface EmailBrandingRepository extends JpaRepository<EmailBranding, UUID> {
    Optional<EmailBranding> findByTenantId(UUID tenantId);
}
