package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PosSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PosSettingRepository extends JpaRepository<PosSetting, UUID> {

    @Query("""
        SELECT p FROM PosSetting p
        WHERE p.warehouseId = :warehouseId
          AND p.tenantId = :tenantId
        """)
    Optional<PosSetting> findByWarehouseId(
        @Param("warehouseId") UUID warehouseId,
        @Param("tenantId") UUID tenantId);
}
