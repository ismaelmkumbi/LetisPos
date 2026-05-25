package io.smartpos.ai.application;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-tenant "learned facts" the assistant can recall across conversations.
 * Designed as a stepping stone to the full AgentDB-backed memory layer in
 * the v3 roadmap — keeps the same shape (key/value with TTL) but uses an
 * in-memory map so it works without external infra.
 *
 * Examples of facts the assistant or upstream services may write:
 *   - "preferred_warehouse" → "MAIN"
 *   - "language" → "sw"
 *   - "last_briefing_date" → "2026-05-24"
 *   - "favourite_report" → "getSalesComparison"
 *
 * Facts have a default 30-day TTL so stale state doesn't haunt the prompt
 * forever. The dynamic-context injection trims to the most recent 6 facts
 * to keep prompts cacheable.
 */
@Component
public class TenantMemoryStore {

    private static final Duration DEFAULT_TTL = Duration.ofDays(30);
    private static final int MAX_FACTS_PER_TENANT = 64;
    private static final int CONTEXT_FACT_LIMIT = 6;

    public record Fact(String key, String value, Instant expiresAt) {
        public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
    }

    private final Map<UUID, Map<String, Fact>> byTenant = new ConcurrentHashMap<>();

    public void remember(UUID tenantId, String key, String value) {
        remember(tenantId, key, value, DEFAULT_TTL);
    }

    public void remember(UUID tenantId, String key, String value, Duration ttl) {
        if (tenantId == null || key == null || value == null) return;
        Map<String, Fact> facts = byTenant.computeIfAbsent(tenantId,
            k -> new ConcurrentHashMap<>());
        facts.put(key, new Fact(key, value, Instant.now().plus(ttl)));
        if (facts.size() > MAX_FACTS_PER_TENANT) {
            evictOldest(facts);
        }
    }

    public Optional<String> recall(UUID tenantId, String key) {
        if (tenantId == null) return Optional.empty();
        Map<String, Fact> facts = byTenant.get(tenantId);
        if (facts == null) return Optional.empty();
        Fact f = facts.get(key);
        if (f == null) return Optional.empty();
        if (f.isExpired()) {
            facts.remove(key);
            return Optional.empty();
        }
        return Optional.of(f.value());
    }

    public void forget(UUID tenantId, String key) {
        Map<String, Fact> facts = byTenant.get(tenantId);
        if (facts != null) facts.remove(key);
    }

    /** Returns up to {@link #CONTEXT_FACT_LIMIT} fresh facts for prompt injection. */
    public List<Fact> contextSlice(UUID tenantId) {
        if (tenantId == null) return List.of();
        Map<String, Fact> facts = byTenant.get(tenantId);
        if (facts == null || facts.isEmpty()) return List.of();
        return facts.values().stream()
            .filter(f -> !f.isExpired())
            .sorted(Comparator.comparing(Fact::expiresAt).reversed())
            .limit(CONTEXT_FACT_LIMIT)
            .toList();
    }

    private void evictOldest(Map<String, Fact> facts) {
        facts.entrySet().stream()
            .min(Comparator.comparing(e -> e.getValue().expiresAt()))
            .ifPresent(e -> facts.remove(e.getKey()));
    }

    // Test helpers
    int sizeForTesting(UUID tenantId) {
        Map<String, Fact> facts = byTenant.get(tenantId);
        return facts == null ? 0 : facts.size();
    }
}
