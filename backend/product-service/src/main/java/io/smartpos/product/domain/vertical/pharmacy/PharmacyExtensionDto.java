package io.smartpos.product.domain.vertical.pharmacy;

import java.time.LocalDate;

/**
 * Typed DTO for pharmacy vertical extension data.
 * Deserialized from the JSONB {@code data} column in {@code product_vertical_extensions}.
 */
public record PharmacyExtensionDto(
    String genericName,
    String strength,
    DosageForm dosageForm,
    Boolean prescriptionRequired,
    ControlledSchedule controlledSchedule,
    StorageCondition storageCondition,
    String ndaRegistration,
    String therapeuticClass,
    String activeIngredient,
    String batchNumber,
    LocalDate expiryDate,
    LocalDate manufactureDate,
    String atcCode
) {
    public enum DosageForm {
        TABLET, CAPSULE, SYRUP, INJECTION, CREAM, DROPS, INHALER
    }

    public enum ControlledSchedule {
        II, III, IV, V
    }

    public enum StorageCondition {
        ROOM_TEMP, REFRIGERATED, FROZEN
    }
}
