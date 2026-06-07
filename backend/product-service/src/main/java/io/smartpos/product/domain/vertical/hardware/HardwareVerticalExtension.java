package io.smartpos.product.domain.vertical.hardware;

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
public class HardwareVerticalExtension implements VerticalExtension {

    private final ObjectMapper objectMapper;

    @Override
    public String getKey() { return "hardware"; }

    @Override
    public String getLabel() { return "Hardware"; }

    @Override
    public String getRequiredFeatureKey() { return "hardware.module"; }

    @Override
    @SneakyThrows
    public void validate(Product product, JsonNode data) {
        if (data == null || data.isNull() || data.isEmpty()) return;

        HardwareExtensionDto dto = objectMapper.treeToValue(data, HardwareExtensionDto.class);

        // Business rule: if any dimension is present, all three must be present
        boolean hasAnyDim = dto.lengthCm() != null || dto.widthCm() != null || dto.heightCm() != null;
        boolean hasAllDim = dto.lengthCm() != null && dto.widthCm() != null && dto.heightCm() != null;
        if (hasAnyDim && !hasAllDim) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "All dimensions (length, width, height) must be specified together");
        }

        // Business rule: voltage must match known format if provided
        if (dto.voltage() != null && !dto.voltage().matches("\\d{2,3}V(-\\d{2,3}V)?")) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Voltage must be in format like '110V', '220V', or '110-240V'");
        }

        // Business rule: warranty vs guarantee — guarantee should not exceed warranty
        if (dto.guaranteeMonths() != null && dto.warrantyMonths() != null
                && dto.guaranteeMonths() > dto.warrantyMonths()) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Guarantee period cannot exceed warranty period");
        }
    }

    @Override
    public Class<?> getExtensionDtoClass() { return HardwareExtensionDto.class; }

    @Override
    public Set<VerticalFieldDef> getFieldDefinitions() {
        return Set.of(
                new VerticalFieldDef("partNumber", "text", "Part Number / SKU", false, 1),
                new VerticalFieldDef("oemBrand", "text", "OEM Brand", false, 2),
                new VerticalFieldDef("warrantyMonths", "number", "Warranty (months)", false, "min:0", 3),
                new VerticalFieldDef("guaranteeMonths", "number", "Guarantee (months)", false, "min:0", 4),
                new VerticalFieldDef("lengthCm", "number", "Length (cm)", false, "min:0", 5),
                new VerticalFieldDef("widthCm", "number", "Width (cm)", false, "min:0", 6),
                new VerticalFieldDef("heightCm", "number", "Height (cm)", false, "min:0", 7),
                new VerticalFieldDef("weightGrams", "number", "Weight (grams)", false, "min:0", 8),
                new VerticalFieldDef("material", "text", "Material", false, 9),
                new VerticalFieldDef("countryOfOrigin", "text", "Country of Origin", false, 10),
                new VerticalFieldDef("powerWatts", "number", "Power (Watts)", false, "min:0", 11),
                new VerticalFieldDef("voltage", "text", "Voltage", false, "max:50", 12),
                new VerticalFieldDef("specifications", "json", "Technical Specifications", false, 13)
        );
    }

    @Override
    public boolean isApplicable(Product product) {
        return product.getType() != null && product.getType().name().equals("STANDARD");
    }
}
