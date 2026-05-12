package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.BannerService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.MarketingBanner;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/commerce/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;
    private final StoreService storeService;

    @GetMapping
    @PreAuthorize("hasAuthority('commerce.products')")
    public List<MarketingBanner> list() {
        Store store = storeService.getByTenant(TenantContext.require());
        return bannerService.listAll(store.getId());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.products')")
    public MarketingBanner getById(@PathVariable UUID id) {
        Store store = storeService.getByTenant(TenantContext.require());
        return bannerService.listAll(store.getId()).stream()
            .filter(b -> b.getId().equals(id))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Banner not found"));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('commerce.products')")
    public ResponseEntity<MarketingBanner> create(@RequestBody MarketingBanner banner) {
        Store store = storeService.getByTenant(TenantContext.require());
        MarketingBanner created = bannerService.create(store.getId(), banner);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.products')")
    public MarketingBanner update(@PathVariable UUID id, @RequestBody MarketingBanner updates) {
        return bannerService.update(id, updates);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.products')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        bannerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
