package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.BrandProfileDto;
import io.smartpos.sales.domain.model.BrandProfile;
import io.smartpos.sales.domain.repository.BrandProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrandProfileService {

    private final BrandProfileRepository repository;

    private static final String DEFAULT_PRIMARY = "#16A34A";
    private static final String DEFAULT_SECONDARY = "#1E293B";
    private static final String DEFAULT_ACCENT = "#16A34A";
    private static final String DEFAULT_FONT = "Inter, system-ui, sans-serif";

    @Transactional(readOnly = true)
    public BrandProfileDto get() {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
                .orElseGet(() -> createDefault(tenantId));
        return toDto(profile);
    }

    @Transactional
    public BrandProfileDto update(BrandProfileDto.UpdateRequest request) {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
                .orElseGet(() -> createDefault(tenantId));

        apply(profile, request);
        return toDto(repository.save(profile));
    }

    @Transactional
    public BrandProfileDto reset() {
        UUID tenantId = TenantContext.require();
        repository.findByTenantId(tenantId).ifPresent(repository::delete);
        BrandProfile fresh = createDefault(tenantId);
        return toDto(fresh);
    }

    private BrandProfile createDefault(UUID tenantId) {
        BrandProfile p = BrandProfile.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .businessName("")
                .tagline("")
                .description("")
                .industry("Retail")
                .brandTone("Professional")
                .primaryColor(DEFAULT_PRIMARY)
                .secondaryColor(DEFAULT_SECONDARY)
                .accentColor(DEFAULT_ACCENT)
                .fontFamily(DEFAULT_FONT)
                .typographyScale("default")
                .logoUrl("")
                .logoSvgUrl("")
                .logoMonochromeUrl("")
                .logoThermalUrl("")
                .faviconUrl("")
                .watermarkUrl("")
                .stampUrl("")
                .signatureUrl("")
                .qrCodeUrl("")
                .website("")
                .facebook("")
                .instagram("")
                .twitter("")
                .linkedin("")
                .build();
        return repository.save(p);
    }

    private void apply(BrandProfile p, BrandProfileDto.UpdateRequest r) {
        if (r.getBusinessName() != null) p.setBusinessName(r.getBusinessName());
        if (r.getTagline() != null) p.setTagline(r.getTagline());
        if (r.getDescription() != null) p.setDescription(r.getDescription());
        if (r.getIndustry() != null) p.setIndustry(r.getIndustry());
        if (r.getBrandTone() != null) p.setBrandTone(r.getBrandTone());

        if (r.getPrimaryColor() != null) p.setPrimaryColor(r.getPrimaryColor());
        if (r.getSecondaryColor() != null) p.setSecondaryColor(r.getSecondaryColor());
        if (r.getAccentColor() != null) p.setAccentColor(r.getAccentColor());
        if (r.getFontFamily() != null) p.setFontFamily(r.getFontFamily());
        if (r.getTypographyScale() != null) p.setTypographyScale(r.getTypographyScale());

        if (r.getLogoUrl() != null) p.setLogoUrl(r.getLogoUrl());
        if (r.getLogoSvgUrl() != null) p.setLogoSvgUrl(r.getLogoSvgUrl());
        if (r.getLogoMonochromeUrl() != null) p.setLogoMonochromeUrl(r.getLogoMonochromeUrl());
        if (r.getLogoThermalUrl() != null) p.setLogoThermalUrl(r.getLogoThermalUrl());
        if (r.getFaviconUrl() != null) p.setFaviconUrl(r.getFaviconUrl());
        if (r.getWatermarkUrl() != null) p.setWatermarkUrl(r.getWatermarkUrl());
        if (r.getStampUrl() != null) p.setStampUrl(r.getStampUrl());
        if (r.getSignatureUrl() != null) p.setSignatureUrl(r.getSignatureUrl());
        if (r.getQrCodeUrl() != null) p.setQrCodeUrl(r.getQrCodeUrl());

        if (r.getWebsite() != null) p.setWebsite(r.getWebsite());
        if (r.getFacebook() != null) p.setFacebook(r.getFacebook());
        if (r.getInstagram() != null) p.setInstagram(r.getInstagram());
        if (r.getTwitter() != null) p.setTwitter(r.getTwitter());
        if (r.getLinkedin() != null) p.setLinkedin(r.getLinkedin());
    }

    private BrandProfileDto toDto(BrandProfile p) {
        return BrandProfileDto.builder()
                .id(p.getId())
                .tenantId(p.getTenantId())
                .businessName(p.getBusinessName())
                .tagline(p.getTagline())
                .description(p.getDescription())
                .industry(p.getIndustry())
                .brandTone(p.getBrandTone())
                .primaryColor(p.getPrimaryColor())
                .secondaryColor(p.getSecondaryColor())
                .accentColor(p.getAccentColor())
                .fontFamily(p.getFontFamily())
                .typographyScale(p.getTypographyScale())
                .logoUrl(p.getLogoUrl())
                .logoSvgUrl(p.getLogoSvgUrl())
                .logoMonochromeUrl(p.getLogoMonochromeUrl())
                .logoThermalUrl(p.getLogoThermalUrl())
                .faviconUrl(p.getFaviconUrl())
                .watermarkUrl(p.getWatermarkUrl())
                .stampUrl(p.getStampUrl())
                .signatureUrl(p.getSignatureUrl())
                .qrCodeUrl(p.getQrCodeUrl())
                .website(p.getWebsite())
                .facebook(p.getFacebook())
                .instagram(p.getInstagram())
                .twitter(p.getTwitter())
                .linkedin(p.getLinkedin())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
