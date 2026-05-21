package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class AssistantPromptBuilder {

    // Frozen system prompt — never interpolate per-request values here.
    // Dynamic context (date, store, role, intent hints) goes into the
    // messages array so the system prompt stays cacheable.
    private static final String BASE_PROMPT = """
        You are LetisPOS Assistant, an AI helper for retail store management.

        Currency: TZS

        You can access sales, inventory, products, customers, finance, HRM,
        and more. Use tools whenever you need real data.

        Rules:
        - Always use tools for factual questions about the store's data
        - Cite specific numbers and names from tool results
        - When a date range is unclear, choose the most useful recent range and say which range you used
        - Prefer charts for trends, rankings, comparisons, and proportions
        - Never invent business data; if the available tools cannot answer exactly, explain the closest available answer
        - If no tool exists for the user's request, say "I don't have a way to do that yet" — never guess it's a permissions issue
        - For analytical answers, lead with the answer, then 2-3 supporting facts, then one recommended action
        - For write actions, briefly state what you're doing as you use the tool — do not just describe the action, execute it
        - If a tool returns an error, tell the user what went wrong
        - Respond in %s
        - Keep responses concise and actionable

        You do NOT have access to: other tenants' data, system administration,
        or the ability to change billing/subscription.
        """;

    private static final String SUPER_ADMIN_EXTRA = """
        You have SUPER_ADMIN access. You can query across all tenants
        and perform administrative actions without draft confirmation.
        """;

    /**
     * Returns the frozen system prompt. Stable across requests from the
     * same tenant/role — safe to cache.
     */
    @SuppressWarnings("unchecked")
    public String buildFrozen(Jwt jwt, String language) {
        var roles = (List<String>) jwt.getClaims().get("roles");
        String lang = language != null && language.equals("sw") ? "Swahili" : "English";

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(BASE_PROMPT, lang));

        RoleProfile profile = RoleProfile.fromJwt(roles);
        sb.append("\n").append(profile.toneInstruction());
        sb.append("\nVerbosity: ").append(profile.verbosity());

        if (roles != null && roles.contains("SUPER_ADMIN")) {
            sb.append("\n").append(SUPER_ADMIN_EXTRA);
        }

        return sb.toString();
    }

    /**
     * Builds a dynamic context preamble with today's date, store info,
     * and intent hints. This goes into the messages array — never the
     * system prompt — so it doesn't break prompt caching.
     */
    @SuppressWarnings("unchecked")
    public String buildDynamicContext(Jwt jwt, String language,
                                      IntentClassification intent,
                                      String conversationSummary) {
        var roles = (List<String>) jwt.getClaims().get("roles");
        String tenantName = jwt.getClaimAsString("tenantName");
        String billingPlan = jwt.getClaimAsString("billingPlan");
        String roleStr = roles != null && !roles.isEmpty()
            ? String.join(", ", roles) : "USER";

        StringBuilder ctx = new StringBuilder();
        ctx.append("Store: ").append(tenantName != null ? tenantName : "Unknown")
           .append(" | Plan: ").append(billingPlan != null ? billingPlan : "STARTER")
           .append(" | Role: ").append(roleStr)
           .append(" | Today: ").append(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));

        // Domain hint from intent
        if (intent != null && intent.primaryDomain() != IntentClassification.Domain.GENERAL
            && intent.confidence() >= 0.5) {
            ctx.append("\nTopic: ").append(intent.primaryDomain().name().toLowerCase());
        }

        // Resolved time
        if (intent != null && intent.time() != null) {
            var time = intent.time();
            if (time.dateFrom() != null && time.dateTo() != null) {
                ctx.append("\nTime range: ").append(time.dateFrom())
                   .append(" to ").append(time.dateTo());
            }
        }

        // Write intent
        if (intent != null && intent.isWriteAction()) {
            ctx.append("\nThis is a write action — use the tool to execute it now.");
        }

        // Conversation summary
        if (conversationSummary != null && !conversationSummary.isBlank()) {
            ctx.append("\nPrevious conversation: ").append(conversationSummary);
        }

        return ctx.toString();
    }
}
