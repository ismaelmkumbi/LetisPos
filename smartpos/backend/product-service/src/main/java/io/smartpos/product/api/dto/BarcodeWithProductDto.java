package io.smartpos.product.api.dto;

import java.util.UUID;

public record BarcodeWithProductDto(
        UUID id,
        UUID variantId,
        String barcode,
        String barcodeType,
        boolean primary,
        UUID productId,
        String productName,
        String productCode
) {}
