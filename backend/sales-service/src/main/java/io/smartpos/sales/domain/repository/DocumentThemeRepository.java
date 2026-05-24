package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.DocumentTheme;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentThemeRepository extends JpaRepository<DocumentTheme, UUID> {
    List<DocumentTheme> findByTenantIdOrderByDocTypeAsc(UUID tenantId);
    Optional<DocumentTheme> findByTenantIdAndDocType(UUID tenantId, String docType);
}
