package io.smartpos.user.i18n;

// LanguageRepository / TranslationRepository are top-level files in this
// package — Spring Data JPA's auto-scan ignores nested interfaces.
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
public class I18nService {

    private final LanguageRepository  langRepo;
    private final TranslationRepository transRepo;

    @Transactional(readOnly = true)
    public List<Language> languages() {
        return langRepo.findByEnabledTrueOrderByCodeAsc();
    }

    /** Returns a flat key→value map for the language, grouped by namespace prefix. */
    @Transactional(readOnly = true)
    public Map<String, Map<String, String>> bundle(String languageCode) {
        Language lang = langRepo.findByCodeIgnoreCase(languageCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Language not found"));
        Map<String, Map<String, String>> out = new HashMap<>();
        for (Translation t : transRepo.findByLanguageCodeIgnoreCase(lang.getCode())) {
            out.computeIfAbsent(t.getNamespace(), k -> new HashMap<>()).put(t.getKey(), t.getValue());
        }
        return out;
    }

    @Transactional
    public Language addLanguage(String code, String name, boolean rtl) {
        if (langRepo.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Language exists");
        }
        return langRepo.save(Language.builder().code(code).name(name).rtl(rtl).enabled(true).build());
    }

    @Transactional
    public Translation upsert(String languageCode, String namespace, String key, String value) {
        Translation t = transRepo.findByLanguageCodeAndNamespaceAndKey(languageCode, namespace, key)
                .orElseGet(() -> Translation.builder()
                        .languageCode(languageCode).namespace(namespace).key(key).build());
        t.setValue(value);
        return transRepo.save(t);
    }

    /** Bulk upload — used by admins importing a JSON dictionary. */
    @Transactional
    public int upsertBulk(String languageCode, String namespace, Map<String, String> entries) {
        int n = 0;
        for (Map.Entry<String, String> e : entries.entrySet()) {
            upsert(languageCode, namespace == null ? "app" : namespace, e.getKey(), e.getValue());
            n++;
        }
        return n;
    }
}
