package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record SaleDto(
        UUID id,
        String ref,
        LocalDate date,
        UUID customerId,
        UUID warehouseId,
        UUID userId,
        boolean pos,
        SaleStatus status,
        PaymentStatus paymentStatus,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal taxRate,
        TaxMethod taxMethod,
        BigDecimal discountTotal,
        BigDecimal shipping,
        BigDecimal grandTotal,
        BigDecimal paidTotal,
        BigDecimal dueTotal,
        String currency,
        BigDecimal exchangeRate,
        String notes,
        List<Line> lines,
        Instant createdAt,
        Instant confirmedAt
) {
    public record Line(
            UUID id, UUID productId, UUID variantId,
            String productName, String productCode,
            BigDecimal unitPrice, BigDecimal qty,
            BigDecimal discount, DiscountType discountType,
            BigDecimal taxRate, TaxMethod taxMethod,
            BigDecimal lineSubtotal, BigDecimal lineTax, BigDecimal lineTotal
    ) {
        public static Line from(SaleLine l) {
            return new Line(l.getId(), l.getProductId(), l.getVariantId(),
                    l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                    l.getUnitPrice(), l.getQty(),
                    l.getDiscount(), l.getDiscountType(),
                    l.getTaxRate(), l.getTaxMethod(),
                    l.getLineSubtotal(), l.getLineTax(), l.getLineTotal());
        }
    }

    public static SaleDto from(Sale s) {
        BigDecimal due = s.getGrandTotal().subtract(s.getPaidTotal());
        return new SaleDto(
                s.getId(), s.getRef(), s.getDate(), s.getCustomerId(),
                s.getWarehouseId(), s.getUserId(), s.isPos(),
                s.getStatus(), s.getPaymentStatus(),
                s.getSubtotal(), s.getTaxTotal(), s.getTaxRate(), s.getTaxMethod(),
                s.getDiscountTotal(), s.getShipping(), s.getGrandTotal(),
                s.getPaidTotal(), due,
                s.getCurrency(), s.getExchangeRate(),
                s.getNotes(),
                s.getLines().stream().map(Line::from).collect(Collectors.toList()),
                s.getCreatedAt(), s.getConfirmedAt()
        );
    }
}
