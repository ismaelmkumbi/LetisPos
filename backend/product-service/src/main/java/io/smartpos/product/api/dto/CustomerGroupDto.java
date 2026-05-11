package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.CustomerGroup;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record CustomerGroupDto(
        UUID id,
        String name,
        String description,
        BigDecimal discountPercent,
        long customerCount
) {
    public static CustomerGroupDto from(CustomerGroup g) {
        return new CustomerGroupDto(g.getId(), g.getName(), g.getDescription(),
                g.getDiscountPercent(), 0);
    }

    public static CustomerGroupDto from(CustomerGroup g, long customerCount) {
        return new CustomerGroupDto(g.getId(), g.getName(), g.getDescription(),
                g.getDiscountPercent(), customerCount);
    }

    public record CreateRequest(
            @NotBlank String name,
            String description,
            BigDecimal discountPercent
    ) {}
}
