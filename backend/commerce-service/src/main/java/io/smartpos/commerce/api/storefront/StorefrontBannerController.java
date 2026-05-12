package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.BannerService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.MarketingBanner;
import io.smartpos.commerce.domain.model.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontBannerController {

    private final StoreService storeService;
    private final BannerService bannerService;

    @GetMapping("/banners")
    public List<MarketingBanner> getBanners(@PathVariable String slug) {
        Store store = storeService.getBySlug(slug);
        return bannerService.listActive(store.getId());
    }
}
