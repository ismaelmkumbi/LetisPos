package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record PurchaseDto(
        UUID id, String ref, LocalDate date,
        UUID supplierId, UUID warehouseId,
        PurchaseStatus status, PaymentStatus paymentStatus,
        BigDecimal subtotal, BigDecimal taxTotal, TaxMethod taxMethod,
        BigDecimal discountTotal, BigDecimal shipping, BigDecimal grandTotal,
        BigDecimal paidTotal, BigDecimal dueTotal,
        String currency, String notes,
        List<SaleDto.Line> lines
) {
    public static PurchaseDto from(Purchase p) {
        BigDecimal due = p.getGrandTotal().subtract(p.getPaidTotal()).max(BigDecimal.ZERO);
        return new PurchaseDto(p.getId(), p.getRef(), p.getDate(),
                p.getSupplierId(), p.getWarehouseId(),
                p.getStatus(), p.getPaymentStatus(),
                p.getSubtotal(), p.getTaxTotal(), p.getTaxMethod(),
                p.getDiscountTotal(), p.getShipping(), p.getGrandTotal(),
                p.getPaidTotal(), due,
                p.getCurrency(), p.getNotes(),
                p.getLines().stream().map(l -> new SaleDto.Line(
                        l.getId(), l.getProductId(), l.getVariantId(),
                        l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                        l.getUnitCost(), BigDecimal.ZERO, l.getQty(),
                        l.getDiscount(), l.getDiscountType(),
                        l.getTaxRate(), l.getTaxMethod(),
                        l.getLineSubtotal(), l.getLineTax(), l.getLineTotal()
                )).collect(Collectors.toList()));
    }

    public record CreateRequest(
            LocalDate date,
            UUID supplierId,
            @NotNull UUID warehouseId,
            @NotEmpty List<@Valid SaleLineInput> lines,          // reuse — unitPrice is treated as unit_cost
            BigDecimal discount,
            TaxMethod taxMethod,
            BigDecimal shipping,
            String currency,
            BigDecimal exchangeRate,
            String notes
    ) {}
}
