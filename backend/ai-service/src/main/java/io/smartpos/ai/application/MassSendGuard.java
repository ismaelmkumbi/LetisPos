package io.smartpos.ai.application;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Prevents the assistant from being prompt-injected into mass-sending
 * messages. Two rules:
 *   1. Any send with more than {@link #BULK_THRESHOLD} recipients must be
 *      issued through the draft-confirmation flow, never auto-executed.
 *   2. Per-tenant rate cap: no more than {@link #PER_HOUR_MAX} sends
 *      may be executed by the assistant in a rolling hour.
 *
 * The guard is *advisory* — the real authorization still lives in the
 * permission system; this just stops the assistant itself from becoming
 * an attack surface.
 */
@Component
public class MassSendGuard {

    public static final int BULK_THRESHOLD = 5;
    public static final int PER_HOUR_MAX = 50;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final Map<UUID, Deque<Instant>> recentSends = new ConcurrentHashMap<>();

    /**
     * @param toolName     "sendEmail" / "sendSMS" / "emailDocument"
     * @param args         tool arguments
     * @param isSuperAdmin whether the caller is platform-level
     * @return null if allowed; otherwise a ToolException describing why blocked
     */
    public ToolException check(String toolName, Map<String, Object> args,
                               UUID tenantId, boolean isSuperAdmin) {
        if (!isSendTool(toolName)) return null;

        int recipientCount = countRecipients(args);
        if (recipientCount > BULK_THRESHOLD && !isSuperAdmin) {
            return new ToolException("BULK_SEND_REQUIRES_CONFIRM",
                "Sending to " + recipientCount + " recipients needs explicit confirmation.",
                "Split the send or have an admin approve a bulk-send draft. The single-recipient flow does not require confirmation.");
        }

        Deque<Instant> stamps = recentSends.computeIfAbsent(tenantId, k -> new ArrayDeque<>());
        synchronized (stamps) {
            Instant cutoff = Instant.now().minus(WINDOW);
            while (!stamps.isEmpty() && stamps.peekFirst().isBefore(cutoff)) {
                stamps.pollFirst();
            }
            if (stamps.size() >= PER_HOUR_MAX) {
                return new ToolException("RATE_LIMITED",
                    "Hourly send limit reached for this tenant.",
                    "Wait an hour or have an admin raise the limit in Settings → Notifications.");
            }
            stamps.addLast(Instant.now());
        }
        return null;
    }

    private boolean isSendTool(String toolName) {
        return "sendEmail".equals(toolName)
            || "sendSMS".equals(toolName)
            || "emailDocument".equals(toolName);
    }

    @SuppressWarnings("unchecked")
    private int countRecipients(Map<String, Object> args) {
        if (args == null) return 0;
        Object r = args.get("recipients");
        if (r instanceof Collection<?> c) return c.size();
        Object single = args.getOrDefault("recipient", args.get("to"));
        if (single instanceof String s) {
            // split on common bulk separators just in case the LLM passes a list as a string
            return s.split("[,;\\s]+").length;
        }
        return single == null ? 0 : 1;
    }
}
