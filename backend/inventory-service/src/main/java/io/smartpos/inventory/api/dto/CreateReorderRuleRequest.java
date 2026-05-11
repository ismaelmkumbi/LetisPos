package io.smartpos.inventory.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateReorderRuleRequest(
    @NotNull UUID productId, UUID variantId, @NotNull UUID warehouseId,
    @NotNull @Positive BigDecimal minQty, @NotNull @Positive BigDecimal reorderQty,
    UUID supplierId, Boolean active
) {}
