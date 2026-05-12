package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.ReorderRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.UUID;

public interface ReorderRuleRepository extends JpaRepository<ReorderRule, UUID>, JpaSpecificationExecutor<ReorderRule> {
    List<ReorderRule> findByWarehouseIdAndActiveTrue(UUID warehouseId);

    List<ReorderRule> findByTenantId(UUID tenantId);
}
