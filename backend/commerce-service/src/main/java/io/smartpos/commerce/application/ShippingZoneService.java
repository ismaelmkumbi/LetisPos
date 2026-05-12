package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.ShippingZone;
import io.smartpos.commerce.domain.repository.ShippingZoneRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShippingZoneService {

    private final ShippingZoneRepository repository;

    @Transactional(readOnly = true)
    public BigDecimal calculateRate(UUID storeId, Map<String, Object> address) {
        UUID tenantId = TenantContext.require();
        List<ShippingZone> zones = repository.findByStoreIdAndTenantIdAndIsActiveTrue(storeId, tenantId);
        if (zones.isEmpty()) return BigDecimal.ZERO;
        // Return first zone's first rate amount for MVP
        ShippingZone zone = zones.get(0);
        // Parse JSONB rates -- simplified for MVP
        return BigDecimal.valueOf(5.00); // default $5 flat rate
    }

    @Transactional(readOnly = true)
    public List<ShippingZone> listZones(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreIdAndTenantIdAndIsActiveTrue(storeId, tenantId);
    }
}
