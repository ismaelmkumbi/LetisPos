package io.smartpos.sales.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.BrandProfileDto;
import io.smartpos.sales.domain.model.BrandPreset;
import io.smartpos.sales.domain.model.BrandProfile;
import io.smartpos.sales.domain.repository.BrandPresetRepository;
import io.smartpos.sales.domain.repository.BrandProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class BrandPresetService {

    private final BrandPresetRepository presetRepo;
    private final BrandProfileRepository profileRepo;
    private static final ObjectMapper mapper = new ObjectMapper();

    public List<BrandPreset> list(String industry) {
        if (industry != null && !industry.isBlank()) {
            return presetRepo.findByIndustryOrderBySortOrderAsc(industry);
        }
        return presetRepo.findAllByOrderBySortOrderAsc();
    }

    public Optional<BrandPreset> get(UUID id) {
        return presetRepo.findById(id);
    }

    @Transactional
    public BrandProfile apply(UUID presetId) {
        UUID tenantId = TenantContext.require();
        BrandPreset preset = presetRepo.findById(presetId)
            .orElseThrow(() -> new NoSuchElementException("Preset not found: " + presetId));

        BrandProfile profile = profileRepo.findByTenantId(tenantId)
            .orElseGet(() -> {
                BrandProfile p = BrandProfile.builder()
                    .id(UUID.randomUUID())
                    .tenantId(tenantId)
                    .build();
                applyDefaults(p);
                return profileRepo.save(p);
            });

        try {
            JsonNode palette = mapper.readTree(preset.getPaletteJson());
            if (palette.has("primary")) profile.setPrimaryColor(palette.get("primary").asText());
            if (palette.has("secondary")) profile.setSecondaryColor(palette.get("secondary").asText());
            if (palette.has("accent")) profile.setAccentColor(palette.get("accent").asText());

            JsonNode typography = mapper.readTree(preset.getTypographyJson());
            if (typography.has("heading")) profile.setFontFamily(typography.get("heading").asText());
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse preset JSON", e);
        }

        return profileRepo.save(profile);
    }

    private void applyDefaults(BrandProfile p) {
        p.setBusinessName("");
        p.setTagline("");
        p.setDescription("");
        p.setIndustry("Retail");
        p.setBrandTone("Professional");
        p.setPrimaryColor("#16A34A");
        p.setSecondaryColor("#1E293B");
        p.setAccentColor("#16A34A");
        p.setFontFamily("Inter, system-ui, sans-serif");
        p.setTypographyScale("default");
        p.setLogoUrl("");
        p.setLogoSvgUrl("");
        p.setLogoMonochromeUrl("");
        p.setLogoThermalUrl("");
        p.setFaviconUrl("");
        p.setWatermarkUrl("");
        p.setStampUrl("");
        p.setSignatureUrl("");
        p.setQrCodeUrl("");
        p.setWebsite("");
        p.setFacebook("");
        p.setInstagram("");
        p.setTwitter("");
        p.setLinkedin("");
    }
}
