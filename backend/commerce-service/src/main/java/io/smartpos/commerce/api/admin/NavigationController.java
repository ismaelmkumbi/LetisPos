package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.NavigationService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.NavigationMenu;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/commerce/navigation")
@RequiredArgsConstructor
public class NavigationController {

    private final NavigationService navigationService;
    private final StoreService storeService;

    @GetMapping("/{location}")
    @PreAuthorize("hasAuthority('commerce.navigation')")
    public ResponseEntity<Map<String, Object>> getMenu(@PathVariable String location) {
        Store store = storeService.getByTenant(TenantContext.require());
        NavigationMenu menu = navigationService.getMenu(store.getId(), location);
        return ResponseEntity.ok(Map.of(
            "id", menu.getId(),
            "location", menu.getLocation(),
            "items", menu.getItems()
        ));
    }

    @PutMapping("/{location}")
    @PreAuthorize("hasAuthority('commerce.navigation')")
    public ResponseEntity<Map<String, Object>> updateMenu(
        @PathVariable String location,
        @RequestBody Map<String, Object> body) {
        Store store = storeService.getByTenant(TenantContext.require());
        String itemsJson = body.get("items") != null ? body.get("items").toString() : "[]";
        NavigationMenu menu = navigationService.updateMenu(store.getId(), location, itemsJson);
        return ResponseEntity.ok(Map.of(
            "id", menu.getId(),
            "location", menu.getLocation(),
            "items", menu.getItems()
        ));
    }
}
