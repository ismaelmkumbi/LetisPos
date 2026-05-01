package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.model.TaxMethod;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateProductRequest(
        String code,
        String name,
        String description,
        UUID categoryId,
        UUID subCategoryId,
        UUID brandId,
        UUID unitId,
        BigDecimal cost,
        BigDecimal price,
        BigDecimal wholesalePrice,
        BigDecimal minPrice,
        Integer points,
        TaxMethod taxMethod,
        BigDecimal taxRate,
        Integer stockAlert,
        ProductType type,
        Boolean status,
        Boolean sellable,
        Boolean featured,
        Boolean hideOnline,
        String imageUrl,
        String barcodeSymbology,
        // Stocky parity (V2)
        Integer warrantyMonths,
        Integer guaranteeMonths,
        BigDecimal lengthCm,
        BigDecimal widthCm,
        BigDecimal heightCm,
        BigDecimal weightGrams,
        Boolean trackSerial,
        Boolean trackImei
) {}
