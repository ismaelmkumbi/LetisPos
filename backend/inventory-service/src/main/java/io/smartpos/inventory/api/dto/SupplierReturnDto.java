package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.SupplierReturn;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record SupplierReturnDto(
        UUID id, String ref, UUID purchaseId, UUID supplierId, UUID warehouseId,
        LocalDate date, String status, String reason, String reasonCode,
        String notes, List<Line> lines
) {
    public record Line(UUID id, UUID productId, UUID variantId,
                       BigDecimal qty, BigDecimal unitCost, String reasonCode) {}

    public static SupplierReturnDto from(SupplierReturn r) {
        return new SupplierReturnDto(
                r.getId(), r.getRef(), r.getPurchaseId(), r.getSupplierId(), r.getWarehouseId(),
                r.getDate(), r.getStatus(), r.getReason(), r.getReasonCode(),
                r.getNotes(),
                r.getLines().stream()
                 .map(l -> new Line(l.getId(), l.getProductId(), l.getVariantId(),
                                    l.getQty(), l.getUnitCost(), l.getReasonCode()))
                 .collect(Collectors.toList())
        );
    }

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull @Positive BigDecimal qty,
            BigDecimal unitCost,
            String reasonCode
    ) {}

    public record CreateSupplierReturnRequest(
            UUID purchaseId,
            UUID supplierId,
            @NotNull UUID warehouseId,
            LocalDate date,
            String reason,
            String reasonCode,
            String notes,
            @NotEmpty List<@Valid LineInput> lines
    ) {}
}
