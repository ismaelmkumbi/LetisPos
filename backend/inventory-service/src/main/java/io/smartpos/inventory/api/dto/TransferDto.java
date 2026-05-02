package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.Transfer;
import io.smartpos.inventory.domain.model.TransferStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record TransferDto(
        UUID id,
        String ref,
        LocalDate date,
        UUID fromWarehouseId,
        UUID toWarehouseId,
        TransferStatus status,
        String notes,
        List<Line> lines
) {
    public record Line(UUID id, UUID productId, UUID variantId, BigDecimal qty, BigDecimal unitCost) {}

    public static TransferDto from(Transfer t) {
        return new TransferDto(
                t.getId(), t.getRef(), t.getDate(),
                t.getFromWarehouseId(), t.getToWarehouseId(),
                t.getStatus(), t.getNotes(),
                t.getLines().stream()
                 .map(l -> new Line(l.getId(), l.getProductId(), l.getVariantId(),
                                    l.getQty(), l.getUnitCost()))
                 .collect(Collectors.toList())
        );
    }

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull @DecimalMin("0.0001") BigDecimal qty,
            BigDecimal unitCost
    ) {}

    public record CreateRequest(
            @NotNull UUID fromWarehouseId,
            @NotNull UUID toWarehouseId,
            LocalDate date,
            @NotEmpty List<@Valid LineInput> lines,
            String notes
    ) {}
}
