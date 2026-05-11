package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    Page<Document> findByTenantIdAndDocumentType(UUID tenantId, String documentType, Pageable pageable);
    Page<Document> findByTenantId(UUID tenantId, Pageable pageable);
    Optional<Document> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT d FROM Document d WHERE d.tenantId = :tenantId "
        + "AND (:q IS NULL OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :q, '%'))) "
        + "AND (:documentType IS NULL OR d.documentType = :documentType) "
        + "AND (:status IS NULL OR d.status = :status) "
        + "AND (:referenceType IS NULL OR d.referenceType = :referenceType) "
        + "AND (CAST(:dateFrom AS timestamp) IS NULL OR d.createdAt >= :dateFrom) "
        + "AND (CAST(:dateTo AS timestamp) IS NULL OR d.createdAt <= :dateTo)")
    Page<Document> search(
        @Param("tenantId") UUID tenantId,
        @Param("q") String q,
        @Param("documentType") String documentType,
        @Param("status") String status,
        @Param("referenceType") String referenceType,
        @Param("dateFrom") Instant dateFrom,
        @Param("dateTo") Instant dateTo,
        Pageable pageable);

    List<Document> findByDocumentTypeAndVfdStatus(String documentType, String vfdStatus);
}
