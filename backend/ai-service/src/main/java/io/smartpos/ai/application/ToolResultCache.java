package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-lived TTL cache for read-tool results, keyed on
 * {tenant, toolName, args}. Cuts the N+1 storm that happens when a user
 * asks the same question 3 times in a row (the LLM does pick the same
 * tool each time, but the user shouldn't pay for it).
 *
 * Write tools are never cached.
 */
@Component
public class ToolResultCache {

    private static final Duration TTL = Duration.ofSeconds(30);
    private static final int MAX_ENTRIES = 2048;

    private record Key(UUID tenantId, String tool, String argsHash) {}
    private record Entry(AssistantDtos.ToolResult result, Instant expiresAt) {}

    private final Map<Key, Entry> cache = new ConcurrentHashMap<>();

    public AssistantDtos.ToolResult get(UUID tenantId, String tool, Map<String, Object> args) {
        if (tenantId == null) return null;
        Entry e = cache.get(new Key(tenantId, tool, argsHash(args)));
        if (e == null) return null;
        if (Instant.now().isAfter(e.expiresAt)) {
            cache.remove(new Key(tenantId, tool, argsHash(args)));
            return null;
        }
        return e.result;
    }

    public void put(UUID tenantId, String tool, Map<String, Object> args,
                    AssistantDtos.ToolResult result) {
        if (tenantId == null || result == null) return;
        if (cache.size() > MAX_ENTRIES) {
            cache.entrySet().removeIf(en -> Instant.now().isAfter(en.getValue().expiresAt));
            if (cache.size() > MAX_ENTRIES) cache.clear(); // last-resort eviction
        }
        cache.put(new Key(tenantId, tool, argsHash(args)),
            new Entry(result, Instant.now().plus(TTL)));
    }

    public void invalidateTenant(UUID tenantId) {
        cache.keySet().removeIf(k -> k.tenantId().equals(tenantId));
    }

    private String argsHash(Map<String, Object> args) {
        if (args == null || args.isEmpty()) return "";
        return new java.util.TreeMap<>(args).toString();
    }

    int sizeForTesting() { return cache.size(); }
}
