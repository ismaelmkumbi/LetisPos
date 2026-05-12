package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.NavigationService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.domain.model.NavigationMenu;
import io.smartpos.commerce.domain.model.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontNavController {

    private final StoreService storeService;
    private final NavigationService navigationService;

    @GetMapping("/navigation")
    public List<Map<String, Object>> getNavigation(@PathVariable String slug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        List<NavigationMenu> menus = navigationService.getAllMenus(store.getId());
        return menus.stream()
            .map(m -> Map.of(
                "location", m.getLocation(),
                "items", (Object) m.getItems()
            ))
            .toList();
    }
}
