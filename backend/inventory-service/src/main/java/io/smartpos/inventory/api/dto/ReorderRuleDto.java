package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.ReorderRule;
import java.math.BigDecimal;
import java.util.UUID;

public record ReorderRuleDto(
    UUID id, UUID productId, UUID variantId, UUID warehouseId,
    BigDecimal minQty, BigDecimal reorderQty, UUID supplierId, boolean active
) {
    public static ReorderRuleDto from(ReorderRule r) {
        return new ReorderRuleDto(r.getId(), r.getProductId(), r.getVariantId(),
            r.getWarehouseId(), r.getMinQty(), r.getReorderQty(), r.getSupplierId(), r.isActive());
    }
}
