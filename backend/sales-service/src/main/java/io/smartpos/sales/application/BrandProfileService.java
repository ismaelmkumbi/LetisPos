package io.smartpos.sales.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.BrandProfileDto;
import io.smartpos.sales.domain.model.BrandProfile;
import io.smartpos.sales.domain.model.BrandProfileVersion;
import io.smartpos.sales.domain.repository.BrandProfileRepository;
import io.smartpos.sales.domain.repository.BrandProfileVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BrandProfileService {

    private final BrandProfileRepository repository;
    private final DocumentThemeService documentThemeService;
    private final BrandProfileVersionRepository versionRepo;
    private static final ObjectMapper mapper = new ObjectMapper();

    private static final String DEFAULT_PRIMARY = "#16A34A";
    private static final String DEFAULT_SECONDARY = "#1E293B";
    private static final String DEFAULT_ACCENT = "#16A34A";
    private static final String DEFAULT_FONT = "Inter, system-ui, sans-serif";

    @Transactional(readOnly = true)
    @Cacheable(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto get() {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
                .orElseGet(() -> createDefault(tenantId));

        // Resolve inheritance: if this profile has a parent, merge parent values
        if (profile.getParentBrandId() != null) {
            BrandProfile parent = repository.findById(profile.getParentBrandId()).orElse(null);
            if (parent != null) {
                profile = resolveInheritance(profile, parent);
            }
        }

        return toDto(profile);
    }

    private BrandProfile resolveInheritance(BrandProfile child, BrandProfile parent) {
        BrandProfile merged = BrandProfile.builder()
            .id(child.getId())
            .tenantId(child.getTenantId())
            .build();

        // If locked mode, only child's unlocked fields are used; the rest come from parent
        boolean locked = "locked".equals(child.getInheritanceMode());
        java.util.Set<String> lockedFields = parseLockedFields(child.getLockedFields());

        // For each field: child wins unless parent locks it
        merged.setBusinessName(childValue(child.getBusinessName(), parent.getBusinessName(), "businessName", locked, lockedFields));
        merged.setTagline(childValue(child.getTagline(), parent.getTagline(), "tagline", locked, lockedFields));
        merged.setDescription(childValue(child.getDescription(), parent.getDescription(), "description", locked, lockedFields));
        merged.setIndustry(childValue(child.getIndustry(), parent.getIndustry(), "industry", locked, lockedFields));
        merged.setBrandTone(childValue(child.getBrandTone(), parent.getBrandTone(), "brandTone", locked, lockedFields));
        merged.setPrimaryColor(childValue(child.getPrimaryColor(), parent.getPrimaryColor(), "primaryColor", locked, lockedFields));
        merged.setSecondaryColor(childValue(child.getSecondaryColor(), parent.getSecondaryColor(), "secondaryColor", locked, lockedFields));
        merged.setAccentColor(childValue(child.getAccentColor(), parent.getAccentColor(), "accentColor", locked, lockedFields));
        merged.setFontFamily(childValue(child.getFontFamily(), parent.getFontFamily(), "fontFamily", locked, lockedFields));
        merged.setTypographyScale(childValue(child.getTypographyScale(), parent.getTypographyScale(), "typographyScale", locked, lockedFields));

        // Assets: prefer child, fall back to parent
        merged.setLogoUrl(coalesce(child.getLogoUrl(), parent.getLogoUrl()));
        merged.setLogoSvgUrl(coalesce(child.getLogoSvgUrl(), parent.getLogoSvgUrl()));
        merged.setLogoMonochromeUrl(coalesce(child.getLogoMonochromeUrl(), parent.getLogoMonochromeUrl()));
        merged.setLogoThermalUrl(coalesce(child.getLogoThermalUrl(), parent.getLogoThermalUrl()));
        merged.setFaviconUrl(coalesce(child.getFaviconUrl(), parent.getFaviconUrl()));

        // Non-visual fields always use child values
        merged.setWebsite(child.getWebsite());
        merged.setFacebook(child.getFacebook());
        merged.setInstagram(child.getInstagram());
        merged.setTwitter(child.getTwitter());
        merged.setLinkedin(child.getLinkedin());

        merged.setParentBrandId(child.getParentBrandId());
        merged.setInheritanceMode(child.getInheritanceMode());
        merged.setLockedFields(child.getLockedFields());
        merged.setCustomDomain(child.getCustomDomain());
        merged.setCustomDomainVerified(child.isCustomDomainVerified());
        merged.setCreatedAt(child.getCreatedAt());
        merged.setUpdatedAt(child.getUpdatedAt());

        return merged;
    }

    private String childValue(String childVal, String parentVal, String fieldName, boolean locked, java.util.Set<String> lockedFields) {
        if (locked && lockedFields.contains(fieldName)) return parentVal;
        return coalesce(childVal, parentVal);
    }

    private String coalesce(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private java.util.Set<String> parseLockedFields(String lockedFieldsJson) {
        if (lockedFieldsJson == null || lockedFieldsJson.isBlank()) return java.util.Set.of();
        try {
            var list = new com.fasterxml.jackson.databind.ObjectMapper()
                .readValue(lockedFieldsJson, java.util.List.class);
            return new java.util.HashSet<>(list);
        } catch (Exception e) {
            return java.util.Set.of();
        }
    }

    // ── Inheritance management ──────────────────────────────────────────

    @Transactional
    @CacheEvict(value = {"brandProfile", "designTokens"}, key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto linkToParent(UUID parentBrandId) {
        UUID tenantId = TenantContext.require();
        BrandProfile child = repository.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        BrandProfile parent = repository.findById(parentBrandId)
            .orElseThrow(() -> new java.util.NoSuchElementException("Parent brand not found"));

        child.setParentBrandId(parent.getId());
        child.setInheritanceMode("inherit_with_overrides");
        BrandProfile saved = repository.save(child);
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(value = {"brandProfile", "designTokens"}, key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto unlink() {
        UUID tenantId = TenantContext.require();
        BrandProfile child = repository.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        child.setParentBrandId(null);
        child.setInheritanceMode("full_override");
        child.setLockedFields(null);
        BrandProfile saved = repository.save(child);
        return toDto(saved);
    }

    // ── Custom domain management ────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto requestDomain(String domain) {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        String token = generateVerificationToken();
        profile.setCustomDomain(domain);
        profile.setCustomDomainVerified(false);
        profile.setCustomDomainVerificationToken(token);
        BrandProfile saved = repository.save(profile);

        BrandProfileDto dto = toDto(saved);
        dto.setCustomDomainVerificationToken(token); // only returned on request
        return dto;
    }

    @Transactional(readOnly = true)
    public BrandProfileDto getDomainStatus() {
        return get();
    }

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto verifyDomain() {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
            .orElseThrow(() -> new java.util.NoSuchElementException("No brand profile found"));

        if (profile.getCustomDomain() == null || profile.getCustomDomain().isBlank()) {
            throw new IllegalStateException("No custom domain requested");
        }

        // In production, this would do actual DNS TXT record lookup.
        // For MVP, accept verification if a token exists.
        if (profile.getCustomDomainVerificationToken() != null
            && !profile.getCustomDomainVerificationToken().isBlank()) {
            profile.setCustomDomainVerified(true);
        } else {
            throw new IllegalStateException("No verification token. Request a domain first.");
        }

        BrandProfile saved = repository.save(profile);
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto removeDomain() {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        profile.setCustomDomain(null);
        profile.setCustomDomainVerified(false);
        profile.setCustomDomainVerificationToken(null);
        BrandProfile saved = repository.save(profile);
        return toDto(saved);
    }

    private String generateVerificationToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // ── Approval workflow ────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto submitForReview() {
        return setStatus("pending_review");
    }

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto approve() {
        BrandProfileDto dto = setStatus("published");
        // Snapshot on publish
        UUID tenantId = TenantContext.require();
        repository.findByTenantId(tenantId).ifPresent(p ->
            createVersion(p, "Published"));
        return dto;
    }

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto reject() {
        return setStatus("draft");
    }

    @Transactional
    @CacheEvict(value = "brandProfile", key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto archive() {
        return setStatus("archived");
    }

    private BrandProfileDto setStatus(String status) {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));
        profile.setStatus(status);
        return toDto(repository.save(profile));
    }

    // ── Versioning ───────────────────────────────────────────────────────

    public List<Map<String, Object>> getVersionHistory() {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId).orElse(null);
        if (profile == null) return List.of();

        return versionRepo.findByBrandProfileIdOrderByVersionNumberDesc(profile.getId())
            .stream().map(v -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", v.getId());
                m.put("versionNumber", v.getVersionNumber());
                m.put("changeSummary", v.getChangeSummary());
                m.put("changedBy", v.getChangedBy());
                m.put("createdAt", v.getCreatedAt());
                return m;
            }).toList();
    }

    private void createVersion(BrandProfile profile, String summary) {
        try {
            int count = versionRepo.countByBrandProfileId(profile.getId());
            String snapshot = mapper.writeValueAsString(toDto(profile));

            BrandProfileVersion v = BrandProfileVersion.builder()
                .brandProfileId(profile.getId())
                .versionNumber(count + 1)
                .snapshot(snapshot)
                .changeSummary(summary)
                .build();
            versionRepo.save(v);
        } catch (Exception e) {
            // Silently skip version creation on failure — don't block the main operation
        }
    }

    // ── Campaign merge ───────────────────────────────────────────────────

    public Map<String, Object> getActiveCampaign() {
        UUID tenantId = TenantContext.require();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hasActiveCampaign", false);
        result.put("campaign", null);
        // Campaigns require a separate table; for MVP, return empty
        // The frontend CampaignManager handles full CRUD
        return result;
    }

    // ── Export / Import ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> exportConfig() {
        BrandProfileDto dto = get();
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("version", 1);
        config.put("exportedAt", java.time.Instant.now().toString());

        Map<String, Object> brand = new LinkedHashMap<>();
        brand.put("businessName", dto.getBusinessName());
        brand.put("tagline", dto.getTagline());
        brand.put("industry", dto.getIndustry());
        brand.put("brandTone", dto.getBrandTone());
        brand.put("primaryColor", dto.getPrimaryColor());
        brand.put("secondaryColor", dto.getSecondaryColor());
        brand.put("accentColor", dto.getAccentColor());
        brand.put("fontFamily", dto.getFontFamily());
        brand.put("typographyScale", dto.getTypographyScale());
        config.put("brand", brand);
        return config;
    }

    @Transactional
    @CacheEvict(value = {"brandProfile", "designTokens"}, key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto importConfig(Map<String, Object> config) {
        @SuppressWarnings("unchecked")
        Map<String, Object> brand = (Map<String, Object>) config.get("brand");
        if (brand == null) return get();

        BrandProfileDto.UpdateRequest req = new BrandProfileDto.UpdateRequest();
        req.setBusinessName((String) brand.get("businessName"));
        req.setTagline((String) brand.get("tagline"));
        req.setIndustry((String) brand.get("industry"));
        req.setBrandTone((String) brand.get("brandTone"));
        req.setPrimaryColor((String) brand.get("primaryColor"));
        req.setSecondaryColor((String) brand.get("secondaryColor"));
        req.setAccentColor((String) brand.get("accentColor"));
        req.setFontFamily((String) brand.get("fontFamily"));
        req.setTypographyScale((String) brand.get("typographyScale"));

        return update(req);
    }

    @Transactional
    @CacheEvict(value = {"brandProfile", "designTokens"}, key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto update(BrandProfileDto.UpdateRequest request) {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
                .orElseGet(() -> createDefault(tenantId));

        String oldPrimary = profile.getPrimaryColor();
        String oldAccent  = profile.getAccentColor();
        String oldFont    = profile.getFontFamily();

        apply(profile, request);
        BrandProfile saved = repository.save(profile);

        // Auto-version: snapshot the saved profile for audit trail
        createVersion(saved, "Brand profile updated");

        // Cascade brand changes to DocumentTheme rows that still inherit
        // from brand (i.e. weren't customised per-document-type).
        if (anyChanged(oldPrimary, saved.getPrimaryColor(),
                       oldAccent,  saved.getAccentColor(),
                       oldFont,    saved.getFontFamily())) {
            documentThemeService.cascadeBrandChange(tenantId,
                oldPrimary, saved.getPrimaryColor(),
                oldAccent,  saved.getAccentColor(),
                oldFont,    saved.getFontFamily());
        }
        return toDto(saved);
    }

    private boolean anyChanged(String oP, String nP, String oA, String nA, String oF, String nF) {
        return !java.util.Objects.equals(oP, nP)
            || !java.util.Objects.equals(oA, nA)
            || !java.util.Objects.equals(oF, nF);
    }

    @Transactional
    @CacheEvict(value = {"brandProfile", "designTokens"}, key = "T(io.smartpos.common.context.TenantContext).require()")
    public BrandProfileDto reset() {
        UUID tenantId = TenantContext.require();
        BrandProfile profile = repository.findByTenantId(tenantId)
                .orElseGet(() -> createDefault(tenantId));

        String oldPrimary = profile.getPrimaryColor();
        String oldAccent  = profile.getAccentColor();
        String oldFont    = profile.getFontFamily();

        applyDefaults(profile);
        BrandProfile saved = repository.save(profile);

        if (anyChanged(oldPrimary, saved.getPrimaryColor(),
                       oldAccent,  saved.getAccentColor(),
                       oldFont,    saved.getFontFamily())) {
            documentThemeService.cascadeBrandChange(tenantId,
                oldPrimary, saved.getPrimaryColor(),
                oldAccent,  saved.getAccentColor(),
                oldFont,    saved.getFontFamily());
        }
        return toDto(saved);
    }

    private BrandProfile createDefault(UUID tenantId) {
        BrandProfile p = BrandProfile.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .build();
        applyDefaults(p);
        return repository.save(p);
    }

    private void applyDefaults(BrandProfile p) {
        p.setBusinessName("");
        p.setTagline("");
        p.setDescription("");
        p.setIndustry("Retail");
        p.setBrandTone("Professional");
        p.setPrimaryColor(DEFAULT_PRIMARY);
        p.setSecondaryColor(DEFAULT_SECONDARY);
        p.setAccentColor(DEFAULT_ACCENT);
        p.setFontFamily(DEFAULT_FONT);
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
                .parentBrandId(p.getParentBrandId())
                .inheritanceMode(p.getInheritanceMode())
                .lockedFields(p.getLockedFields())
                .customDomain(p.getCustomDomain())
                .customDomainVerified(p.isCustomDomainVerified())
                .customDomainVerificationToken(p.getCustomDomainVerificationToken())
                .status(p.getStatus())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
