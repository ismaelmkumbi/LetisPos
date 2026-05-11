package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(UUID documentId);
    int countByDocumentId(UUID documentId);
}
