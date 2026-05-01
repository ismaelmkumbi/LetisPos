package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.model.ProductType;
import io.smartpos.product.domain.model.TaxMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record ProductDto(
        UUID id,
        String code,
        String name,
        String description,
        UUID categoryId,
        UUID subCategoryId,
        UUID brandId,
        UUID unitId,
        BigDecimal cost,
        BigDecimal price,
        // Multi-tier pricing (Stocky parity)
        BigDecimal wholesalePrice,
        BigDecimal minPrice,
        Integer points,
        TaxMethod taxMethod,
        BigDecimal taxRate,
        int stockAlert,
        boolean variant,
        ProductType type,
        boolean status,
        boolean sellable,
        boolean featured,
        boolean hideOnline,
        String imageUrl,
        String barcodeSymbology,
        // Stocky parity additions (V2)
        Integer warrantyMonths,
        Integer guaranteeMonths,
        BigDecimal lengthCm,
        BigDecimal widthCm,
        BigDecimal heightCm,
        BigDecimal weightGrams,
        boolean trackSerial,
        boolean trackImei,
        // Relations
        List<VariantDto> variants,
        List<BarcodeDto> barcodes,
        List<ComboItemDto> comboItems,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductDto from(Product p) {
        return new ProductDto(
                p.getId(), p.getCode(), p.getName(), p.getDescription(),
                p.getCategoryId(), p.getSubCategoryId(), p.getBrandId(), p.getUnitId(),
                p.getCost(), p.getPrice(),
                p.getWholesalePrice(), p.getMinPrice(), p.getPoints(),
                p.getTaxMethod(), p.getTaxRate(),
                p.getStockAlert(), p.isVariant(), p.getType(), p.isStatus(),
                p.isSellable(), p.isFeatured(), p.isHideOnline(),
                p.getImageUrl(), p.getBarcodeSymbology(),
                p.getWarrantyMonths(), p.getGuaranteeMonths(),
                p.getLengthCm(), p.getWidthCm(), p.getHeightCm(), p.getWeightGrams(),
                p.isTrackSerial(), p.isTrackImei(),
                p.getVariants().stream().map(VariantDto::from).collect(Collectors.toList()),
                p.getBarcodes().stream().map(BarcodeDto::from).collect(Collectors.toList()),
                p.getComboItems().stream().map(ComboItemDto::from).collect(Collectors.toList()),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
