package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.GoodsReceipt;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record GoodsReceiptDto(
        UUID id, String ref, UUID purchaseId, UUID supplierId, UUID warehouseId,
        LocalDate date, String status, String notes, List<Line> lines
) {
    public record Line(UUID id, UUID productId, UUID variantId,
                       BigDecimal orderedQty, BigDecimal receivedQty, BigDecimal unitCost) {}

    public static GoodsReceiptDto from(GoodsReceipt r) {
        return new GoodsReceiptDto(
                r.getId(), r.getRef(), r.getPurchaseId(), r.getSupplierId(), r.getWarehouseId(),
                r.getDate(), r.getStatus(), r.getNotes(),
                r.getLines().stream()
                 .map(l -> new Line(l.getId(), l.getProductId(), l.getVariantId(),
                                    l.getOrderedQty(), l.getReceivedQty(), l.getUnitCost()))
                 .collect(Collectors.toList())
        );
    }

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull @Positive BigDecimal orderedQty,
            @NotNull @Positive BigDecimal receivedQty,
            BigDecimal unitCost
    ) {}

    public record CreateGoodsReceiptRequest(
            UUID purchaseId,
            UUID supplierId,
            @NotNull UUID warehouseId,
            LocalDate date,
            String notes,
            @NotEmpty List<@Valid LineInput> lines
    ) {}
}
