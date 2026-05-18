package io.smartpos.product.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record DuplicateProductRequest(
        @Size(max = 64) String code,
        @NotBlank @Size(max = 255) String name,
        UUID categoryId,
        UUID brandId,
        UUID unitId,
        UUID supplierId,
        Boolean copyVariants,
        Boolean copyBarcodes
) {}
