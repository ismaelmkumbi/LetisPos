package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.ProductSerial;
import io.smartpos.product.domain.model.SerialStatus;
import io.smartpos.product.domain.model.SerialType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record SerialDto(
        UUID id,
        UUID productId,
        UUID variantId,
        UUID warehouseId,
        String serialNumber,
        SerialType serialType,
        SerialStatus status,
        String purchaseRef,
        String saleRef,
        LocalDate warrantyStart,
        LocalDate warrantyEnd,
        String notes
) {
    public static SerialDto from(ProductSerial s) {
        return new SerialDto(
                s.getId(), s.getProductId(), s.getVariantId(), s.getWarehouseId(),
                s.getSerialNumber(), s.getSerialType(), s.getStatus(),
                s.getPurchaseRef(), s.getSaleRef(),
                s.getWarrantyStart(), s.getWarrantyEnd(), s.getNotes());
    }

    /** Inbound payload — used by both create and bulk create endpoints. */
    public record CreateRequest(
            @NotNull UUID productId,
            UUID variantId,
            UUID warehouseId,
            @NotBlank @Size(max = 128) String serialNumber,
            SerialType serialType,
            String purchaseRef,
            LocalDate warrantyStart,
            LocalDate warrantyEnd,
            String notes
    ) {}

    public record StatusUpdate(
            @NotNull SerialStatus status,
            String saleRef,
            String notes
    ) {}
}
