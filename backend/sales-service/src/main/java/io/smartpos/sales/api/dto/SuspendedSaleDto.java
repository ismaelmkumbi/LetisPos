package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.SuspendedSale;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SuspendedSaleDto(
    UUID id,
    String ref,
    UUID tenantId,
    UUID terminalId,
    UUID userId,
    UUID customerId,
    UUID warehouseId,
    String lines,
    String discountType,
    BigDecimal discountValue,
    String taxMethod,
    String notes,
    SuspendedSaleStatus status,
    BigDecimal grandTotal,
    Integer totalItems,
    Instant expiresAt,
    Instant createdAt
) {
    public static SuspendedSaleDto from(SuspendedSale s) {
        return new SuspendedSaleDto(
            s.getId(), s.getRef(), s.getTenantId(), s.getTerminalId(),
            s.getUserId(), s.getCustomerId(), s.getWarehouseId(),
            s.getLines(),
            s.getDiscountType() != null ? s.getDiscountType().name() : null,
            s.getDiscountValue(),
            s.getTaxMethod() != null ? s.getTaxMethod().name() : null,
            s.getNotes(), s.getStatus(), s.getGrandTotal(),
            s.getTotalItems(), s.getExpiresAt(), s.getCreatedAt()
        );
    }

    public record CreateRequest(
        @NotNull UUID tenantId,
        UUID terminalId,
        UUID customerId,
        @NotNull UUID warehouseId,
        @NotBlank String lines,
        String discountType,
        BigDecimal discountValue,
        String taxMethod,
        String notes,
        @NotNull BigDecimal grandTotal,
        @NotNull Integer totalItems
    ) {}
}
