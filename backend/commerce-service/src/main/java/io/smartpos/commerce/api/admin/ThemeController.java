package io.smartpos.commerce.api.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    @GetMapping("/theme")
    @PreAuthorize("hasAuthority('commerce.theme')")
    public ResponseEntity<Map<String, Object>> getTheme() {
        Store store = storeService.getByTenant(TenantContext.require());
        Theme theme = themeService.getTheme(store.getId());
        return ResponseEntity.ok(Map.of(
            "id", theme.getId(),
            "name", theme.getName(),
            "settings", parseSettings(theme.getSettings()),
            "isActive", theme.isActive()
        ));
    }

    @PutMapping("/theme")
    @PreAuthorize("hasAuthority('commerce.theme')")
    public ResponseEntity<Map<String, Object>> updateTheme(@RequestBody Map<String, Object> body) {
        Store store = storeService.getByTenant(TenantContext.require());
        Theme updates = new Theme();
        if (body.containsKey("name")) {
            updates.setName((String) body.get("name"));
        }
        if (body.containsKey("settings")) {
            updates.setSettings(serializeSettings(body.get("settings")));
        }
        Theme theme = themeService.updateTheme(store.getId(), updates);
        return ResponseEntity.ok(Map.of(
            "id", theme.getId(),
            "name", theme.getName(),
            "settings", parseSettings(theme.getSettings()),
            "isActive", theme.isActive()
        ));
    }

    /** Serialize a settings Map/POJO to a JSON string. */
    private String serializeSettings(Object value) {
        if (value == null) return "{}";
        if (value instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid theme settings JSON", e);
        }
    }

    /** Parse the stored JSON string back to an object so the response is
     *  {@code "settings": {…}} not {@code "settings": "{…}"}. */
    private Map<String, Object> parseSettings(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(raw, Map.class);
            return map;
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
