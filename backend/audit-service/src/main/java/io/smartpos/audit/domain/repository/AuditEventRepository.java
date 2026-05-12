package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.AuditEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findByTenantIdOrderByTimestampDesc(UUID tenantId, Pageable pageable);

    List<AuditEvent> findByTenantIdAndActionInOrderByTimestampDesc(UUID tenantId, List<String> actions, Pageable pageable);

    long countByTenantIdAndTimestampAfter(UUID tenantId, Instant after);

    @Modifying
    @Transactional
    int deleteByTenantIdAndTimestampBefore(UUID tenantId, Instant before);
}
