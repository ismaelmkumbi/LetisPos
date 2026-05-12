package io.smartpos.sales.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GenerateCouponCodesRequest(
    @NotBlank String prefix,
    @NotNull @Min(1) int quantity
) {}
