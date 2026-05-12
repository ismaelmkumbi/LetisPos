package io.smartpos.audit.domain.repository;

import io.smartpos.audit.domain.model.Backup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BackupRepository extends JpaRepository<Backup, UUID> {

    List<Backup> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
