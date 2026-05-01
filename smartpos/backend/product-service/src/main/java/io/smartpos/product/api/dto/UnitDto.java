package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.Unit;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record UnitDto(
        UUID id, String name, String shortName, UUID baseUnitId, BigDecimal conversionFactor
) {
    public static UnitDto from(Unit u) {
        return new UnitDto(u.getId(), u.getName(), u.getShortName(),
                u.getBaseUnitId(), u.getConversionFactor());
    }
    public record CreateRequest(
            @NotBlank String name,
            @NotBlank String shortName,
            UUID baseUnitId,
            @DecimalMin("0.000001") BigDecimal conversionFactor
    ) {}
}
