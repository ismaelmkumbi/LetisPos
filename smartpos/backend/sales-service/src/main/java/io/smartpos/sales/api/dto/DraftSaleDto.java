package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.DraftSale;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record DraftSaleDto(
        UUID id,
        UUID userId,
        UUID warehouseId,
        UUID customerId,
        String label,
        Object data,                 // passthrough JSON (cart state)
        Instant updatedAt
) {
    public static DraftSaleDto from(DraftSale d, Object parsedData) {
        return new DraftSaleDto(d.getId(), d.getUserId(), d.getWarehouseId(),
                d.getCustomerId(), d.getLabel(), parsedData, d.getUpdatedAt());
    }

    public record SaveRequest(
            @NotNull UUID warehouseId,
            UUID customerId,
            String label,
            @NotNull Object data             // any JSON the POS wants to stash
    ) {}
}
