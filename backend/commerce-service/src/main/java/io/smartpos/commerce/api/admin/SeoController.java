package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.SeoService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.SeoDefaults;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/commerce/seo")
@RequiredArgsConstructor
public class SeoController {

    private final SeoService seoService;
    private final StoreService storeService;

    @GetMapping
    @PreAuthorize("hasAuthority('commerce.settings')")
    public ResponseEntity<SeoDefaults> getSeo() {
        Store store = storeService.getByTenant(TenantContext.require());
        SeoDefaults defaults = seoService.getOrCreate(store.getId());
        return ResponseEntity.ok(defaults);
    }

    @PutMapping
    @PreAuthorize("hasAuthority('commerce.settings')")
    public ResponseEntity<SeoDefaults> updateSeo(@RequestBody SeoDefaults updates) {
        Store store = storeService.getByTenant(TenantContext.require());
        SeoDefaults defaults = seoService.update(store.getId(), updates);
        return ResponseEntity.ok(defaults);
    }
}
