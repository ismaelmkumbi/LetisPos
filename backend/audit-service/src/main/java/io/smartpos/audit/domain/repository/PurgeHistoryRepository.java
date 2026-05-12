package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.PurgeHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurgeHistoryRepository extends JpaRepository<PurgeHistory, UUID> {

    List<PurgeHistory> findByTenantIdOrderByExecutedAtDesc(UUID tenantId, Pageable pageable);

    List<PurgeHistory> findByTenantIdOrderByExecutedAtDesc(UUID tenantId);
}
