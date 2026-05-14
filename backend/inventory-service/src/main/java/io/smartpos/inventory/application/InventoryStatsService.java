package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Aggregation queries consumed by Report Service. Inventory Service doesn't
 * know per-product cost (that lives in Product Service), so "valuation" here
 * means quantity-based metrics. Report Service joins these with cost data
 * from Product Service to compute monetary valuation.
 */
@Service
@RequiredArgsConstructor
public class InventoryStatsService {

    private final EntityManager em;

    public record WarehouseSummary(
            long distinctProducts,
            BigDecimal totalOnHand,
            BigDecimal totalReserved,
            BigDecimal totalAvailable,
            long lowStockLines
    ) {}

    @Transactional(readOnly = true)
    public WarehouseSummary summary(UUID warehouseId) {
        String jpql = """
            SELECT COUNT(s),
                   COALESCE(SUM(s.onHand), 0),
                   COALESCE(SUM(s.reserved), 0),
                   COALESCE(SUM(s.onHand - s.reserved), 0),
                   SUM(CASE WHEN (s.onHand - s.reserved) <= s.stockAlertThreshold AND s.stockAlertThreshold > 0 THEN 1 ELSE 0 END)
            FROM StockLevel s
            WHERE (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
              AND s.tenantId = :tenantId
            """;
        Object[] row = (Object[]) em.createQuery(jpql)
                .setParameter("warehouseId", warehouseId)
                .setParameter("tenantId", TenantContext.get().orElse(null))
                .getSingleResult();
        long   distinct  = ((Number) row[0]).longValue();
        BigDecimal onHand    = (BigDecimal) row[1];
        BigDecimal reserved  = (BigDecimal) row[2];
        BigDecimal available = (BigDecimal) row[3];
        long   lowStock  = row[4] == null ? 0L : ((Number) row[4]).longValue();
        return new WarehouseSummary(distinct, onHand, reserved, available, lowStock);
    }
}
