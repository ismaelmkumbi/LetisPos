package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.application.ThemeService;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.model.Theme;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/commerce")
@RequiredArgsConstructor
public class ThemeController {

    private final ThemeService themeService;
    private final StoreService storeService;

    @GetMapping("/theme")
    @PreAuthorize("hasAuthority('commerce.theme')")
    public ResponseEntity<Map<String, Object>> getTheme() {
        Store store = storeService.getByTenant(TenantContext.require());
        Theme theme = themeService.getTheme(store.getId());
        return ResponseEntity.ok(Map.of(
            "id", theme.getId(),
            "name", theme.getName(),
            "settings", theme.getSettings(),
            "isActive", theme.isActive()
        ));
    }

    @PutMapping("/theme")
    @PreAuthorize("hasAuthority('commerce.theme')")
    public ResponseEntity<Map<String, Object>> updateTheme(@RequestBody Map<String, Object> body) {
        Store store = storeService.getByTenant(TenantContext.require());
        Theme updates = new Theme();
        updates.setSettings(body.get("settings") != null ? body.get("settings").toString() : "{}");
        Theme theme = themeService.updateTheme(store.getId(), updates);
        return ResponseEntity.ok(Map.of(
            "id", theme.getId(),
            "name", theme.getName(),
            "settings", theme.getSettings(),
            "isActive", theme.isActive()
        ));
    }
}
