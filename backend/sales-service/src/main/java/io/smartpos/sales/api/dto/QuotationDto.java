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

public record QuotationDto(
        UUID id, String ref, LocalDate date,
        UUID customerId, UUID warehouseId,
        QuotationStatus status,
        BigDecimal subtotal, BigDecimal taxTotal, TaxMethod taxMethod,
        BigDecimal discountTotal, BigDecimal shipping, BigDecimal grandTotal,
        String currency, String notes,
        UUID convertedSaleId,
        List<SaleDto.Line> lines
) {
    public static QuotationDto from(Quotation q) {
        return new QuotationDto(q.getId(), q.getRef(), q.getDate(),
                q.getCustomerId(), q.getWarehouseId(), q.getStatus(),
                q.getSubtotal(), q.getTaxTotal(), q.getTaxMethod(),
                q.getDiscountTotal(), q.getShipping(), q.getGrandTotal(),
                q.getCurrency(), q.getNotes(), q.getConvertedSaleId(),
                q.getLines().stream().map(l -> new SaleDto.Line(
                        l.getId(), l.getProductId(), l.getVariantId(),
                        l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                        l.getUnitPrice(), l.getQty(),
                        l.getDiscount(), l.getDiscountType(),
                        l.getTaxRate(), l.getTaxMethod(),
                        l.getLineSubtotal(), l.getLineTax(), l.getLineTotal()
                )).collect(Collectors.toList()));
    }

    public record CreateRequest(
            LocalDate date,
            UUID customerId,
            @NotNull UUID warehouseId,
            @NotEmpty List<@Valid SaleLineInput> lines,
            BigDecimal discount,
            TaxMethod taxMethod,
            BigDecimal shipping,
            String currency,
            BigDecimal exchangeRate,
            String notes
    ) {}
}
