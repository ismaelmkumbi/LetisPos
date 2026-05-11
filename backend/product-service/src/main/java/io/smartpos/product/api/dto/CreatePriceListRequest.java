package io.smartpos.product.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePriceListRequest(
        @NotBlank @Size(max = 150) String name,
        String description,
        @Size(max = 100) String customerGroup,
        String currency,
        Boolean active,
        LocalDate startDate,
        LocalDate endDate,
        List<LineInput> lines
) {
    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            @NotNull BigDecimal price,
            BigDecimal minQty,
            BigDecimal maxQty
    ) {}
}
