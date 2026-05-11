package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.TemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TemplateVersionRepository extends JpaRepository<TemplateVersion, UUID> {
    List<TemplateVersion> findByTemplateOverrideIdOrderByVersionNumberDesc(UUID templateOverrideId);
    int countByTemplateOverrideId(UUID templateOverrideId);
}
