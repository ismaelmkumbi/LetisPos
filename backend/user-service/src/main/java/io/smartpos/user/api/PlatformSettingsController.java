package io.smartpos.user.api;

import io.smartpos.user.domain.model.PlatformSetting;
import io.smartpos.user.domain.repository.PlatformSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Platform-wide configuration for super admins.
 * Manages API keys, provider settings, and feature toggles
 * that services read at startup.
 */
@RestController
@RequestMapping("/api/v1/admin/platform-settings")
@RequiredArgsConstructor
public class PlatformSettingsController {

    private final PlatformSettingRepository repo;

    @GetMapping
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Map<String, List<PlatformSettingDto>>> listAll() {
        List<PlatformSetting> all = repo.findAll();
        Map<String, List<PlatformSettingDto>> grouped = new LinkedHashMap<>();
        for (PlatformSetting s : all) {
            grouped.computeIfAbsent(s.getCategory(), k -> new java.util.ArrayList<>())
                    .add(PlatformSettingDto.from(s));
        }
        return ResponseEntity.ok(grouped);
    }

    @PutMapping
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Map<String, String>> updateBatch(@Valid @RequestBody List<UpdateEntry> entries) {
        Map<String, String> updated = new LinkedHashMap<>();
        for (UpdateEntry e : entries) {
            PlatformSetting setting = repo.findById(e.key())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown key: " + e.key()));
            setting.setValue(e.value());
            repo.save(setting);
            updated.put(e.key(), setting.isEncrypted() ? "****" : setting.getValue());
        }
        return ResponseEntity.ok(updated);
    }

    public record PlatformSettingDto(
            String key, String value, String category,
            String label, String description, boolean encrypted) {
        static PlatformSettingDto from(PlatformSetting s) {
            return new PlatformSettingDto(
                    s.getKey(),
                    s.isEncrypted() && s.getValue() != null ? "****" : s.getValue(),
                    s.getCategory(), s.getLabel(), s.getDescription(), s.isEncrypted());
        }
    }

    public record UpdateEntry(String key, String value) {}

}

/**
 * Internal endpoint for other services to read platform settings.
 * Path /api/internal/** is whitelisted in SecurityConfig (no JWT required).
 */
@RestController
@RequestMapping("/api/internal/platform-settings")
@RequiredArgsConstructor
class InternalPlatformSettingsController {

    private final PlatformSettingRepository repo;

    @GetMapping
    public ResponseEntity<Map<String, String>> listRaw() {
        Map<String, String> raw = new LinkedHashMap<>();
        for (PlatformSetting s : repo.findAll()) {
            raw.put(s.getKey(), s.getValue());
        }
        return ResponseEntity.ok(raw);
    }
}
