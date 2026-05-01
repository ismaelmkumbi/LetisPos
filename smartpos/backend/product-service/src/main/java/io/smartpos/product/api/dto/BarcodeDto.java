package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.BarcodeType;
import io.smartpos.product.domain.model.ProductBarcode;

import java.util.UUID;

public record BarcodeDto(
        UUID id,
        UUID variantId,
        String barcode,
        BarcodeType barcodeType,
        boolean primary
) {
    public static BarcodeDto from(ProductBarcode b) {
        return new BarcodeDto(b.getId(), b.getVariantId(), b.getBarcode(),
                b.getBarcodeType(), b.isPrimary());
    }
}
