package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.application.ThemeService;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.model.Theme;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontThemeController {

    private final StoreService storeService;
    private final ThemeService themeService;

    @GetMapping("/theme")
    public ResponseEntity<Map<String, Object>> getTheme(@PathVariable String slug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        Theme theme = themeService.getTheme(store.getId());
        return ResponseEntity.ok(Map.of(
            "id", theme.getId(),
            "name", theme.getName(),
            "settings", theme.getSettings(),
            "isActive", theme.isActive()
        ));
    }
}
