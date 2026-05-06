package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {
    Optional<Warehouse> findByCodeIgnoreCase(String code);
    List<Warehouse> findByTenantId(UUID tenantId);
    long count();
}
