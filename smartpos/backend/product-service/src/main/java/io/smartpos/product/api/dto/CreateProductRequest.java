package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.model.TaxMethod;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateProductRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String name,
        String description,
        UUID categoryId,
        UUID subCategoryId,
        UUID brandId,
        UUID unitId,
        @NotNull @DecimalMin("0.0") BigDecimal cost,
        @NotNull @DecimalMin("0.0") BigDecimal price,
        // Multi-tier pricing
        @DecimalMin("0.0") BigDecimal wholesalePrice,
        @DecimalMin("0.0") BigDecimal minPrice,
        @Min(0) Integer points,
        TaxMethod taxMethod,
        @DecimalMin("0.0") BigDecimal taxRate,
        @Min(0) Integer stockAlert,
        ProductType type,
        Boolean status,
        Boolean sellable,
        Boolean featured,
        Boolean hideOnline,
        String imageUrl,
        @Size(max = 16) String barcodeSymbology,
        // Stocky parity (V2)
        @Min(0) Integer warrantyMonths,
        @Min(0) Integer guaranteeMonths,
        @DecimalMin("0.0") BigDecimal lengthCm,
        @DecimalMin("0.0") BigDecimal widthCm,
        @DecimalMin("0.0") BigDecimal heightCm,
        @DecimalMin("0.0") BigDecimal weightGrams,
        Boolean trackSerial,
        Boolean trackImei,
        // Relations
        List<VariantInput> variants,
        List<BarcodeInput> barcodes,
        List<ComboItemInput> comboItems
) {
    public record VariantInput(
            String name,
            String code,
            BigDecimal cost,
            BigDecimal price,
            BigDecimal wholesalePrice,
            BigDecimal minPrice,
            String imageUrl
    ) {}
    public record BarcodeInput(String barcode, String barcodeType, Boolean primary, UUID variantId) {}
    public record ComboItemInput(
            @NotNull UUID componentProductId,
            @NotNull @DecimalMin("0.0001") BigDecimal qty,
            BigDecimal unitCost,
            BigDecimal unitPrice,
            Integer position
    ) {}
}
