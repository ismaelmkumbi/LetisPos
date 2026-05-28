package io.smartpos.sales.api;

import io.smartpos.sales.domain.model.BrandPreset;
import io.smartpos.sales.application.BrandPresetService;
import io.smartpos.sales.domain.model.BrandProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/brand/presets")
@RequiredArgsConstructor
public class BrandPresetController {

    private final BrandPresetService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(value = "industry", required = false) String industry) {
        List<BrandPreset> presets = service.list(industry);
        List<Map<String, Object>> result = presets.stream()
            .map(this::toMap)
            .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> get(@PathVariable UUID id) {
        return service.get(id)
            .map(p -> ResponseEntity.ok(toMap(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/apply")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> apply(@PathVariable UUID id) {
        BrandProfile profile = service.apply(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("primaryColor", profile.getPrimaryColor());
        result.put("secondaryColor", profile.getSecondaryColor());
        result.put("accentColor", profile.getAccentColor());
        result.put("fontFamily", profile.getFontFamily());
        result.put("message", "Preset applied successfully");
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toMap(BrandPreset p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("industry", p.getIndustry());
        m.put("description", p.getDescription());
        m.put("thumbnailUrl", p.getThumbnailUrl());
        m.put("paletteJson", p.getPaletteJson());
        m.put("typographyJson", p.getTypographyJson());
        m.put("isPremium", p.isPremium());
        m.put("sortOrder", p.getSortOrder());
        return m;
    }
}
