package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.PurchaseReturn;
import io.smartpos.sales.domain.model.ReturnStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record PurchaseReturnDto(
        UUID id, String ref, LocalDate date,
        UUID purchaseId, UUID supplierId, UUID warehouseId,
        ReturnStatus status, String reason,
        BigDecimal grandTotal,
        List<Line> lines
) {
    public record Line(
            UUID id, UUID productId, UUID variantId,
            String productName, BigDecimal unitPrice, BigDecimal qty, BigDecimal lineTotal
    ) {}

    public static PurchaseReturnDto from(PurchaseReturn r) {
        return new PurchaseReturnDto(
                r.getId(), r.getRef(), r.getDate(),
                r.getPurchaseId(), r.getSupplierId(), r.getWarehouseId(),
                r.getStatus(), r.getReason(),
                r.getGrandTotal(),
                r.getLines().stream().map(l -> new Line(
                        l.getId(), l.getProductId(), l.getVariantId(),
                        l.getProductNameSnapshot(),
                        l.getUnitPrice(), l.getQty(), l.getLineTotal()
                )).collect(Collectors.toList())
        );
    }

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            String productName,
            @NotNull @DecimalMin("0.0") BigDecimal unitPrice,
            @NotNull @DecimalMin("0.0001") BigDecimal qty
    ) {}

    public record CreateRequest(
            LocalDate date,
            String reason,
            @NotEmpty List<@Valid LineInput> lines
    ) {}
}
