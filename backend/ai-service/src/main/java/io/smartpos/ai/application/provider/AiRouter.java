package io.smartpos.ai.application.provider;

import io.smartpos.ai.api.dto.IntentClassification;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    /** Look up a specific provider by name, or null if not found. */
    public AiProvider byName(String name) {
        return byName.get(name);
    }

    public AiProvider active() {
        AiProvider chosen = byName.getOrDefault(props.provider(), byName.get("stub"));
        try {
            return chosen;
        } catch (Exception e) {
            log.warn("Configured provider {} unavailable, falling back to stub: {}", chosen.name(), e.getMessage());
            return byName.get("stub");
        }
    }

    /**
     * Intent-aware tier routing. Cheap providers handle trivial cashier
     * lookups (HELP / single-domain low-complexity intents); the main
     * provider handles analytical, multi-tool, or write intents.
     *
     * Configure with smartpos.ai.provider.cheap (defaults to "stub" so
     * deployments without a cheap key still work) and
     * smartpos.ai.provider.cheap-enabled=true.
     *
     * Falls back to {@link #active()} on any miss.
     */
    public AiProvider forIntent(IntentClassification intent) {
        if (!cheapEnabled || intent == null) return active();
        boolean simple =
            intent.confidence() >= 0.7
            && !intent.isWriteAction()
            && intent.primaryDomain() != IntentClassification.Domain.PLATFORM_ADMIN
            && intent.primaryDomain() != IntentClassification.Domain.FINANCE
            && intent.primaryDomain() != IntentClassification.Domain.GENERAL;
        if (!simple) return active();

        AiProvider cheap = byName.get(cheapProvider);
        if (cheap == null) return active();
        log.debug("Tier-routing intent {} → {} (cheap tier)",
            intent.primaryDomain(), cheap.name());
        return cheap;
    }

    @Value("${smartpos.ai.provider.cheap:stub}")
    private String cheapProvider;

    @Value("${smartpos.ai.provider.cheap-enabled:false}")
    private boolean cheapEnabled;
}
