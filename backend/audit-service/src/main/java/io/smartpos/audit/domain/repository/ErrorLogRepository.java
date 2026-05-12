package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.ErrorLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ErrorLogRepository extends JpaRepository<ErrorLog, UUID> {

    List<ErrorLog> findByTenantIdOrderByOccurredAtDesc(UUID tenantId, Pageable pageable);

    List<ErrorLog> findByServiceOrderByOccurredAtDesc(String service, Pageable pageable);

    List<ErrorLog> findByLevelOrderByOccurredAtDesc(String level, Pageable pageable);

    @Modifying
    @Transactional
    int deleteByTenantIdAndOccurredAtBefore(UUID tenantId, Instant before);
}
