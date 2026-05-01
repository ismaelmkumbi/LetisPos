package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.Adjustment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record AdjustmentDto(
        UUID id, String ref, LocalDate date, UUID warehouseId,
        String reason, String notes, List<Line> lines
) {
    public record Line(UUID id, UUID productId, UUID variantId, BigDecimal qtyDelta) {}

    public static AdjustmentDto from(Adjustment a) {
        return new AdjustmentDto(
                a.getId(), a.getRef(), a.getDate(), a.getWarehouseId(),
                a.getReason(), a.getNotes(),
                a.getLines().stream()
                 .map(l -> new Line(l.getId(), l.getProductId(), l.getVariantId(), l.getQtyDelta()))
                 .collect(Collectors.toList())
        );
    }

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull BigDecimal qtyDelta     // signed
    ) {}

    public record CreateRequest(
            @NotNull UUID warehouseId,
            LocalDate date,
            String reason,
            String notes,
            @NotEmpty List<@Valid LineInput> lines
    ) {}
}
