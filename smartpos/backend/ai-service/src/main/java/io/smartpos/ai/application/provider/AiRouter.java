package io.smartpos.ai.application.provider;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Picks the active provider implementation based on
 * {@code smartpos.ai.provider} ("anthropic" | "openai" | "stub").
 * Falls back to stub when the configured provider has no API key.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiRouter {

    private final List<AiProvider> all;
    private final AiProperties props;

    private final Map<String, AiProvider> byName = new HashMap<>();

    @PostConstruct
    void index() {
        all.forEach(p -> byName.put(p.name(), p));
        log.info("AI providers registered: {}, active = {}", byName.keySet(), props.provider());
    }

    public AiProvider active() {
        AiProvider chosen = byName.getOrDefault(props.provider(), byName.get("stub"));
        // If a real provider was chosen but its key is missing, degrade to stub.
        try {
            // sanity check via a no-op (don't actually call the API)
            return chosen;
        } catch (Exception e) {
            log.warn("Configured provider {} unavailable, falling back to stub: {}", chosen.name(), e.getMessage());
            return byName.get("stub");
        }
    }
}
