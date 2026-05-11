package io.smartpos.report.application;

import io.smartpos.report.api.dto.MoversReport;
import io.smartpos.report.api.dto.TurnoverRow;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.InventoryFeign;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryReportService {

    private final InventoryFeign inventory;

    // SpEL coalesces null `warehouseId` to a literal sentinel so the cache
    // doesn't choke on null keys (it would otherwise throw "Null key
    // returned for cache operation"). The string namespace also keeps the
    // global-summary slot from colliding with a per-warehouse summary.
    @Cacheable(value = RedisCacheConfig.CACHE_INVENTORY,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#warehouseId)",
               unless = "#result == null")
    public InventoryFeign.WarehouseSummary summary(UUID warehouseId) {
        return inventory.summary(warehouseId);
    }

    public List<TurnoverRow> turnover(UUID warehouseId, int months) {
        // TODO: compute inventory turnover from snapshots and COGS
        return List.of();
    }

    public MoversReport movers(UUID warehouseId, int limit) {
        // TODO: compute top/bottom movers from sales data
        return new MoversReport(List.of(), List.of());
    }
}
