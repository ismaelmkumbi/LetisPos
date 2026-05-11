package io.smartpos.payment.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TaxRateInput(
        @NotBlank String name,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal rate,
        @NotBlank String type,
        String description,
        Boolean active
) {}
