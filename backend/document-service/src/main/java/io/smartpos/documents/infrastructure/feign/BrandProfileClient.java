package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;

/**
 * Fetches tenant-level brand identity and document theme overrides
 * from the sales-service Brand API. Used as defaults when POS-level
 * branding is not configured.
 */
@FeignClient(name = "sales-service", contextId = "brandProfileClient",
    url = "${spring.cloud.openfeign.client.config.sales-service.url}")
public interface BrandProfileClient {

    record BrandProfileDto(
        String businessName,
        String tagline,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String fontFamily,
        String typographyScale,
        String logoUrl,
        String logoSvgUrl,
        String logoMonochromeUrl,
        String logoThermalUrl,
        String faviconUrl,
        String watermarkUrl,
        String stampUrl,
        String signatureUrl,
        String qrCodeUrl,
        String website,
        String facebook,
        String instagram,
        String twitter,
        String linkedin
    ) {}

    record DocumentThemeDto(
        String docType,
        String primaryColor,
        String accentColor,
        String fontFamily,
        String headerStyle,
        boolean showWatermark,
        boolean showQrCode
    ) {}

    @GetMapping("/api/v1/brand/profile")
    BrandProfileDto getProfile();

    @GetMapping("/api/v1/brand/document-themes")
    List<DocumentThemeDto> getThemes();
}
