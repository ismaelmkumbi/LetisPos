package io.smartpos.user.i18n;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/i18n")
@RequiredArgsConstructor
public class I18nController {

    private final I18nService service;

    /** Available languages — public-ish; needed at app boot to render the picker. */
    @GetMapping("/languages")
    @PreAuthorize("isAuthenticated()")
    public List<Language> languages() { return service.languages(); }

    /** Translation bundle for the chosen language. */
    @GetMapping("/{languageCode}")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Map<String, String>> bundle(@PathVariable String languageCode) {
        return service.bundle(languageCode);
    }

    @PostMapping("/languages")
    @PreAuthorize("hasAuthority('settings.i18n')")
    public ResponseEntity<Language> addLanguage(@RequestParam String code,
                                                @RequestParam String name,
                                                @RequestParam(defaultValue = "false") boolean rtl) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addLanguage(code, name, rtl));
    }

    @PutMapping("/{languageCode}/{namespace}/{key}")
    @PreAuthorize("hasAuthority('settings.i18n')")
    public Translation upsert(@PathVariable String languageCode,
                              @PathVariable String namespace,
                              @PathVariable String key,
                              @RequestBody String value) {
        return service.upsert(languageCode, namespace, key, value);
    }

    /** Bulk import: accepts a flat JSON object of key→value pairs. */
    @PostMapping("/{languageCode}/{namespace}/bulk")
    @PreAuthorize("hasAuthority('settings.i18n')")
    public Map<String, Integer> bulkUpsert(@PathVariable String languageCode,
                                           @PathVariable String namespace,
                                           @RequestBody Map<String, String> entries) {
        int n = service.upsertBulk(languageCode, namespace, entries);
        return Map.of("upserted", n);
    }
}
