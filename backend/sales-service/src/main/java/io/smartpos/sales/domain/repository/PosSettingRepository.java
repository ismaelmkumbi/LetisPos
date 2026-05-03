package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PosSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PosSettingRepository extends JpaRepository<PosSetting, UUID> {

    Optional<PosSetting> findByWarehouseId(UUID warehouseId);
}
