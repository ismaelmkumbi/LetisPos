package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.ProductBatch;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ProductBatchDto(
        UUID id,
        String batchNumber,
        UUID productId,
        UUID variantId,
        UUID warehouseId,
        LocalDate manufacturingDate,
        LocalDate expiryDate,
        BigDecimal onHand,
        BigDecimal reserved,
        BigDecimal available,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductBatchDto from(ProductBatch b) {
        return new ProductBatchDto(
                b.getId(),
                b.getBatchNumber(),
                b.getProductId(),
                b.getVariantId(),
                b.getWarehouseId(),
                b.getManufacturingDate(),
                b.getExpiryDate(),
                b.getOnHand(),
                b.getReserved(),
                b.available(),
                b.getStatus(),
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }
}
