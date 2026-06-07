package io.smartpos.product.domain.vertical.hardware;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Typed DTO for hardware vertical extension data.
 * Deserialized from the JSONB {@code data} column in {@code product_vertical_extensions}.
 */
public record HardwareExtensionDto(
    String partNumber,
    String oemBrand,
    Integer warrantyMonths,
    Integer guaranteeMonths,
    Integer powerWatts,
    String voltage,
    String material,
    String countryOfOrigin,
    BigDecimal lengthCm,
    BigDecimal widthCm,
    BigDecimal heightCm,
    BigDecimal weightGrams,
    Map<String, String> specifications
) {}
