package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brand_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandProfile {

    @Id
    private UUID id;

    @Column(name = "tenant_id", unique = true, nullable = false)
    private UUID tenantId;

    // Business identity
    @Column(name = "business_name")
    private String businessName;

    private String tagline;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String industry;

    @Column(name = "brand_tone")
    private String brandTone;

    // Visual identity
    @Column(name = "primary_color")
    private String primaryColor;

    @Column(name = "secondary_color")
    private String secondaryColor;

    @Column(name = "accent_color")
    private String accentColor;

    @Column(name = "font_family")
    private String fontFamily;

    @Column(name = "typography_scale")
    private String typographyScale;

    // Asset URLs
    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "logo_svg_url", columnDefinition = "TEXT")
    private String logoSvgUrl;

    @Column(name = "logo_monochrome_url", columnDefinition = "TEXT")
    private String logoMonochromeUrl;

    @Column(name = "logo_thermal_url", columnDefinition = "TEXT")
    private String logoThermalUrl;

    @Column(name = "favicon_url", columnDefinition = "TEXT")
    private String faviconUrl;

    @Column(name = "watermark_url", columnDefinition = "TEXT")
    private String watermarkUrl;

    @Column(name = "stamp_url", columnDefinition = "TEXT")
    private String stampUrl;

    @Column(name = "signature_url", columnDefinition = "TEXT")
    private String signatureUrl;

    @Column(name = "qr_code_url", columnDefinition = "TEXT")
    private String qrCodeUrl;

    // Web & social
    private String website;
    private String facebook;
    private String instagram;
    private String twitter;
    private String linkedin;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
