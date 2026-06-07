package io.smartpos.product.application;

import io.smartpos.product.domain.vertical.VerticalExtension;
import io.smartpos.product.domain.vertical.VerticalFieldDef;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Runtime discovery and indexing of all {@link VerticalExtension} Spring beans.
 *
 * Each vertical module registers itself as a bean; this registry indexes them
 * by key at startup so the core product service can look up the right validator,
 * field definitions, and lifecycle hooks with zero compile-time coupling.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VerticalRegistry {

    private final List<VerticalExtension> extensions; // autowired: all beans implementing VerticalExtension

    private final Map<String, VerticalExtension> byKey = new HashMap<>();
    private final Set<String> allKeys = new LinkedHashSet<>();

    @PostConstruct
    void index() {
        for (VerticalExtension ext : extensions) {
            byKey.put(ext.getKey(), ext);
            allKeys.add(ext.getKey());
            log.info("Registered vertical: {} ({} — {} fields)",
                    ext.getKey(), ext.getLabel(), ext.getFieldDefinitions().size());
        }
        if (extensions.isEmpty()) {
            log.warn("No VerticalExtension beans found — vertical module framework is loaded but empty.");
        }
    }

    // ---- lookup ----

    public Optional<VerticalExtension> get(String key) {
        return Optional.ofNullable(byKey.get(key));
    }

    public boolean has(String key) {
        return byKey.containsKey(key);
    }

    public Collection<VerticalExtension> all() {
        return Collections.unmodifiableCollection(byKey.values());
    }

    public Set<String> keys() {
        return Collections.unmodifiableSet(allKeys);
    }

    /**
     * Return field definitions for all registered verticals,
     * grouped by vertical key. Used by the field-definitions API.
     */
    public Map<String, Set<VerticalFieldDef>> allFieldDefinitions() {
        return byKey.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().getFieldDefinitions()));
    }
}
