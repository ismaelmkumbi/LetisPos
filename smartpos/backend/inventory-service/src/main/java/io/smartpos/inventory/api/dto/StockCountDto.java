package io.smartpos.inventory.api.dto;

import io.smartpos.inventory.domain.model.StockCount;
import io.smartpos.inventory.domain.model.StockCountStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record StockCountDto(
        UUID id, String ref, UUID warehouseId, StockCountStatus status,
        String notes, Instant startedAt, Instant postedAt, List<Line> lines
) {
    public record Line(UUID id, UUID productId, UUID variantId,
                       BigDecimal systemQty, BigDecimal countedQty, BigDecimal difference) {}

    public static StockCountDto from(StockCount c) {
        return new StockCountDto(
                c.getId(), c.getRef(), c.getWarehouseId(), c.getStatus(),
                c.getNotes(), c.getStartedAt(), c.getPostedAt(),
                c.getLines().stream()
                 .map(l -> new Line(l.getId(), l.getProductId(), l.getVariantId(),
                                    l.getSystemQty(), l.getCountedQty(), l.getDifference()))
                 .collect(Collectors.toList())
        );
    }

    public record CreateRequest(@NotNull UUID warehouseId, String notes) {}

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull BigDecimal countedQty
    ) {}

    public record SubmitLinesRequest(@NotEmpty List<@Valid LineInput> lines) {}

    /** Lightweight DTO for the paginated list endpoint (no lines, includes warehouse name). */
    public record ListItem(
            UUID id, String ref, UUID warehouseId, String warehouseName,
            String status, Instant date
    ) {
        public static ListItem from(StockCount c, String warehouseName) {
            return new ListItem(
                    c.getId(), c.getRef(), c.getWarehouseId(), warehouseName,
                    c.getStatus().name(), c.getStartedAt()
            );
        }
    }
}
