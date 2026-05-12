package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.ShippingZone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ShippingZoneRepository extends JpaRepository<ShippingZone, UUID> {
    List<ShippingZone> findByStoreIdAndTenantIdAndIsActiveTrue(UUID storeId, UUID tenantId);
}
