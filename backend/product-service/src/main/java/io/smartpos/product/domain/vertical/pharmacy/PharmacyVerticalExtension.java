package io.smartpos.product.domain.vertical.pharmacy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.vertical.VerticalExtension;
import io.smartpos.product.domain.vertical.VerticalFieldDef;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Slf4j
@Component
@RequiredArgsConstructor
public class PharmacyVerticalExtension implements VerticalExtension {

    private final ObjectMapper objectMapper;

    @Override
    public String getKey() { return "pharmacy"; }

    @Override
    public String getLabel() { return "Pharmacy"; }

    @Override
    public String getRequiredFeatureKey() { return "pharmacy.module"; }

    @Override
    @SneakyThrows
    public void validate(Product product, JsonNode data) {
        if (data == null || data.isNull() || data.isEmpty()) return;

        PharmacyExtensionDto dto = objectMapper.treeToValue(data, PharmacyExtensionDto.class);

        // Business rule: Rx products must have a strength specified
        if (Boolean.TRUE.equals(dto.prescriptionRequired()) && dto.strength() == null) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Prescription-required products must have a strength specified");
        }

        // Business rule: expiry must be after manufacture date
        if (dto.expiryDate() != null && dto.manufactureDate() != null
                && !dto.expiryDate().isAfter(dto.manufactureDate())) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Expiry date must be after manufacture date");
        }

        // Business rule: NDA/TFDA registration required for all pharmaceutical products in TZ
        if (dto.ndaRegistration() == null || dto.ndaRegistration().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "NDA/TFDA registration number is required for pharmaceutical products");
        }

        // Business rule: ATC code format validation
        if (dto.atcCode() != null && !dto.atcCode().matches("[A-Z]\\d{2}[A-Z]{2}\\d{2}")) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "ATC code must match format like 'N02BE01' (letter, 2 digits, 2 letters, 2 digits)");
        }
    }

    @Override
    public Class<?> getExtensionDtoClass() { return PharmacyExtensionDto.class; }

    @Override
    public Set<VerticalFieldDef> getFieldDefinitions() {
        return Set.of(
                new VerticalFieldDef("genericName", "text", "Generic Name", false, 1),
                new VerticalFieldDef("strength", "text", "Strength", false, 2),
                new VerticalFieldDef("dosageForm", "select", "Dosage Form", false, 3),
                new VerticalFieldDef("prescriptionRequired", "toggle", "Prescription Required", false, 4),
                new VerticalFieldDef("controlledSchedule", "select", "Controlled Schedule", false, 5),
                new VerticalFieldDef("storageCondition", "select", "Storage Condition", false, 6),
                new VerticalFieldDef("ndaRegistration", "text", "NDA / TFDA Registration", true, 7),
                new VerticalFieldDef("therapeuticClass", "text", "Therapeutic Class", false, 8),
                new VerticalFieldDef("activeIngredient", "text", "Active Ingredient", false, 9),
                new VerticalFieldDef("batchNumber", "text", "Batch Number", false, 10),
                new VerticalFieldDef("expiryDate", "date", "Expiry Date", false, 11),
                new VerticalFieldDef("manufactureDate", "date", "Manufacture Date", false, 12),
                new VerticalFieldDef("atcCode", "text", "ATC Code", false, "pattern:[A-Z]\\d{2}[A-Z]{2}\\d{2}", 13)
        );
    }

    @Override
    public boolean isApplicable(Product product) {
        return product.getType() != null && product.getType().name().equals("STANDARD");
    }
}
