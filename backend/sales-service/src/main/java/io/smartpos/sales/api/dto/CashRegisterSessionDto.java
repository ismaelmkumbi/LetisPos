package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.CashRegisterSession;
import io.smartpos.sales.domain.model.CashRegisterStatus;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CashRegisterSessionDto(
    UUID id,
    UUID warehouseId,
    UUID userId,
    Instant openedAt,
    Instant closedAt,
    BigDecimal openingBalance,
    BigDecimal countedCash,
    BigDecimal expectedCash,
    CashRegisterStatus status,
    String notes,
    Instant createdAt,
    Instant updatedAt
) {
    public static CashRegisterSessionDto from(CashRegisterSession s) {
        return new CashRegisterSessionDto(
            s.getId(),
            s.getWarehouseId(),
            s.getUserId(),
            s.getOpenedAt(),
            s.getClosedAt(),
            s.getOpeningBalance(),
            s.getCountedCash(),
            s.getExpectedCash(),
            s.getStatus(),
            s.getNotes(),
            s.getCreatedAt(),
            s.getUpdatedAt()
        );
    }

    public record OpenRequest(
        @NotNull UUID warehouseId,
        BigDecimal openingBalance
    ) {}

    public record CloseRequest(
        @NotNull BigDecimal countedCash,
        String notes
    ) {}
}
