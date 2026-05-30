package io.smartpos.sales.api.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrandProfileDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID tenantId;

    // Business identity
    private String businessName;
    private String tagline;
    private String description;
    private String industry;
    private String brandTone;

    // Visual identity
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String fontFamily;
    private String typographyScale;

    // Asset URLs
    private String logoUrl;
    private String logoSvgUrl;
    private String logoMonochromeUrl;
    private String logoThermalUrl;
    private String faviconUrl;
    private String watermarkUrl;
    private String stampUrl;
    private String signatureUrl;
    private String qrCodeUrl;

    // Web & social
    private String website;
    private String facebook;
    private String instagram;
    private String twitter;
    private String linkedin;

    // Inheritance (V24)
    private UUID parentBrandId;
    private String inheritanceMode;
    private String lockedFields;

    // Custom domain (V25)
    private String customDomain;
    private boolean customDomainVerified;
    private String customDomainVerificationToken;

    // Approval (V28)
    private String status;

    private Instant createdAt;
    private Instant updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String businessName;
        private String tagline;
        private String description;
        private String industry;
        private String brandTone;

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a hex color, e.g. #16A34A")
        private String primaryColor;

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a hex color, e.g. #1E293B")
        private String secondaryColor;

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a hex color, e.g. #16A34A")
        private String accentColor;

        private String fontFamily;
        private String typographyScale;

        private String logoUrl;
        private String logoSvgUrl;
        private String logoMonochromeUrl;
        private String logoThermalUrl;
        private String faviconUrl;
        private String watermarkUrl;
        private String stampUrl;
        private String signatureUrl;
        private String qrCodeUrl;

        private String website;
        private String facebook;
        private String instagram;
        private String twitter;
        private String linkedin;
    }
}
