package io.smartpos.integration.domain.repository;

import io.smartpos.integration.domain.model.IntegrationSync;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface IntegrationSyncRepository extends JpaRepository<IntegrationSync, UUID> {

    @Query("""
           SELECT s FROM IntegrationSync s
           WHERE s.tenantId = :tenantId
             AND (:provider IS NULL OR s.provider = :provider)
             AND (:status   IS NULL OR s.status   = :status)
           ORDER BY s.createdAt DESC
           """)
    Page<IntegrationSync> search(@Param("provider") String provider,
                                 @Param("status")   String status,
                                 @Param("tenantId") UUID tenantId,
                                 Pageable pageable);

    @Query("""
           SELECT s FROM IntegrationSync s
           WHERE s.status = 'FAILED' AND s.nextRetryAt IS NOT NULL AND s.nextRetryAt <= :now
              AND s.attempts < :maxAttempts
           ORDER BY s.nextRetryAt ASC
           """)
    List<IntegrationSync> retryable(@Param("now") Instant now, @Param("maxAttempts") int maxAttempts, Pageable p);
}
