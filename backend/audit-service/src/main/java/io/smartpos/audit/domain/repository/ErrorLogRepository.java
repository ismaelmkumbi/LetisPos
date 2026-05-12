package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.ErrorLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface ErrorLogRepository extends JpaRepository<ErrorLog, UUID> {

    Page<ErrorLog> findByService(String service, Pageable pageable);

    Page<ErrorLog> findByLevel(String level, Pageable pageable);

    Page<ErrorLog> findByOccurredAtBetween(Instant dateFrom, Instant dateTo, Pageable pageable);

    @Modifying
    @Transactional
    int deleteByTenantIdAndOccurredAtBefore(UUID tenantId, Instant before);
}
