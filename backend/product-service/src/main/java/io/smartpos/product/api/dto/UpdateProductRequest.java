package io.smartpos.product.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.model.TaxMethod;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record UpdateProductRequest(
        String code,
        String name,
        String description,
        UUID categoryId,
        UUID subCategoryId,
        UUID brandId,
        UUID unitId,
        UUID supplierId,
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
        Boolean trackImei,
        // Variants & barcodes — when present, replace the full collection
        List<VariantInput> variants,
        List<BarcodeInput> barcodes,
        // Vertical extensions (V22)
        @JsonProperty("verticalExtensions") Map<String, JsonNode> verticalExtensions
) {
    public record VariantInput(
            String name, String code,
            BigDecimal cost, BigDecimal price,
            BigDecimal wholesalePrice, BigDecimal minPrice,
            String imageUrl
    ) {}

    public record BarcodeInput(
            String barcode, String barcodeType,
            Boolean primary, UUID variantId
    ) {}
}
