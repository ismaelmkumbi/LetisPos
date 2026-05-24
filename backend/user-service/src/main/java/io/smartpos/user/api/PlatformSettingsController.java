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
    public ResponseEntity<List<ServiceGroup>> listServices() {
        // Group by service_key → each service has its settings as children
        List<PlatformSetting> all = repo.findAllGroupedByService();
        Map<String, ServiceGroup> groups = new LinkedHashMap<>();
        for (PlatformSetting s : all) {
            String sk = s.getServiceKey() != null ? s.getServiceKey() : s.getCategory();
            groups.computeIfAbsent(sk, k -> new ServiceGroup(
                    sk,
                    s.getServiceName() != null ? s.getServiceName() : s.getCategory(),
                    s.getServiceIcon() != null ? s.getServiceIcon() : "settings",
                    s.getCategory(),
                    s.getSortOrder(),
                    new java.util.ArrayList<>()
            )).settings().add(PlatformSettingDto.from(s));
        }
        return ResponseEntity.ok(new java.util.ArrayList<>(groups.values()));
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

    public record ServiceGroup(String serviceKey, String serviceName, String serviceIcon,
                                String category, int sortOrder, List<PlatformSettingDto> settings) {}

    public record PlatformSettingDto(
            String key, String value, String category,
            String label, String description, boolean encrypted,
            String serviceKey, String serviceName, String serviceIcon, int sortOrder) {
        static PlatformSettingDto from(PlatformSetting s) {
            return new PlatformSettingDto(
                    s.getKey(),
                    s.isEncrypted() && s.getValue() != null ? "****" : s.getValue(),
                    s.getCategory(), s.getLabel(), s.getDescription(), s.isEncrypted(),
                    s.getServiceKey(), s.getServiceName(), s.getServiceIcon(), s.getSortOrder());
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
