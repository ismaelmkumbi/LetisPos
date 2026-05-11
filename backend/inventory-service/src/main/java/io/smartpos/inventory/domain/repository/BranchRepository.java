package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findByTenantIdOrderByNameAsc(UUID tenantId);
    boolean existsByTenantIdAndCodeIgnoreCase(UUID tenantId, String code);
}
