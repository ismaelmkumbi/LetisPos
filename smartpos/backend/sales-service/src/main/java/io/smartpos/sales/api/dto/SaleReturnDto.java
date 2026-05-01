package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.ReturnStatus;
import io.smartpos.sales.domain.model.SaleReturn;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record SaleReturnDto(
        UUID id, String ref, LocalDate date,
        UUID saleId, UUID customerId, UUID warehouseId,
        ReturnStatus status, String reason,
        BigDecimal subtotal, BigDecimal taxTotal, BigDecimal grandTotal,
        List<Line> lines
) {
    public record Line(UUID id, UUID productId, UUID variantId,
                       String productName, BigDecimal unitPrice, BigDecimal qty, BigDecimal lineTotal) {}

    public static SaleReturnDto from(SaleReturn r) {
        return new SaleReturnDto(r.getId(), r.getRef(), r.getDate(),
                r.getSaleId(), r.getCustomerId(), r.getWarehouseId(),
                r.getStatus(), r.getReason(),
                r.getSubtotal(), r.getTaxTotal(), r.getGrandTotal(),
                r.getLines().stream().map(l -> new Line(
                        l.getId(), l.getProductId(), l.getVariantId(),
                        l.getProductNameSnapshot(), l.getUnitPrice(),
                        l.getQty(), l.getLineTotal())).collect(Collectors.toList()));
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
