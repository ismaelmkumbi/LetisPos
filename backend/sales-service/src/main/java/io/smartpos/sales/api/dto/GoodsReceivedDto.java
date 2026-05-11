package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.Purchase;
import io.smartpos.sales.domain.model.PurchaseLine;
import io.smartpos.sales.domain.model.PurchaseStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record GoodsReceivedDto(
    UUID id,
    String ref,
    LocalDate date,
    UUID supplierId,
    UUID warehouseId,
    PurchaseStatus status,
    BigDecimal grandTotal,
    BigDecimal totalOrderedQty,
    BigDecimal totalReceivedQty,
    List<ReceivedLine> lines,
    Instant receivedAt
) {
    public record ReceivedLine(
        UUID id,
        UUID productId,
        String productName,
        String productCode,
        BigDecimal orderedQty,
        BigDecimal receivedQty,
        BigDecimal remainingQty
    ) {
        public static ReceivedLine from(PurchaseLine l) {
            return new ReceivedLine(
                l.getId(), l.getProductId(),
                l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                l.getQty(), l.getReceivedQty(),
                l.getQty().subtract(l.getReceivedQty())
            );
        }
    }

    public static GoodsReceivedDto from(Purchase p) {
        BigDecimal totalOrdered = p.getLines().stream()
                .map(PurchaseLine::getQty).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalReceived = p.getLines().stream()
                .map(PurchaseLine::getReceivedQty).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new GoodsReceivedDto(
            p.getId(), p.getRef(), p.getDate(), p.getSupplierId(),
            p.getWarehouseId(), p.getStatus(), p.getGrandTotal(),
            totalOrdered, totalReceived,
            p.getLines().stream().map(ReceivedLine::from).collect(Collectors.toList()),
            p.getReceivedAt()
        );
    }
}
