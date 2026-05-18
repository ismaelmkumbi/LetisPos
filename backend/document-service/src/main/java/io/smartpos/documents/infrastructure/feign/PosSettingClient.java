package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

/**
 * Feign client for sales-service PosSetting — fetches store branding.
 */
@FeignClient(name = "sales-service", contextId = "posSettingClient", url = "${spring.cloud.openfeign.client.config.sales-service.url}")
public interface PosSettingClient {

    /**
     * Minimal DTO for the branding fields we need from PosSetting.
     * PosSettingDto in sales-service has 30+ fields; we only map what templates use.
     */
    record BrandingDto(
        String storeName,
        String logoUrl,
        String storeAddress,
        String storePhone,
        String storeEmail,
        String storeTaxId,
        String storeWebsite,
        boolean showLogo,
        int     logoSize,
        boolean showStoreName,
        boolean showStoreAddress,
        boolean showStorePhone,
        boolean showStoreEmail,
        String primaryColor,
        String accentColor,
        String fontFamily,
        String paperSize,
        String footerMessage
    ) {}

    @GetMapping("/api/v1/pos-settings")
    BrandingDto get(@RequestParam UUID warehouseId);
}
