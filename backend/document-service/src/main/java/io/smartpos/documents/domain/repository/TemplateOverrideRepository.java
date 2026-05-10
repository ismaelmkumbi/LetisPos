package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.TemplateOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface TemplateOverrideRepository extends JpaRepository<TemplateOverride, UUID> {
    Optional<TemplateOverride> findByTenantIdAndDocumentTypeAndIsActiveTrue(
            UUID tenantId, String documentType);
    List<TemplateOverride> findByTenantId(UUID tenantId);
}
