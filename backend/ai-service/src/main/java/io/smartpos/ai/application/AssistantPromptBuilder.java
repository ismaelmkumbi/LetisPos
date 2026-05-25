package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class AssistantPromptBuilder {

    private final TenantMemoryStore tenantMemory;

    public AssistantPromptBuilder(TenantMemoryStore tenantMemory) {
        this.tenantMemory = tenantMemory;
    }


    // Frozen system prompt — never interpolate per-request values here.
    // Dynamic context (date, store, role, intent hints) goes into the
    // messages array so the system prompt stays cacheable.
    private static final String BASE_PROMPT = """
        You are LetisPOS Assistant, an AI helper for retail store management.

        Currency: %s
        Format all monetary amounts with the currency symbol above (e.g. 1,500,000 TSh or $1,500.00).
        Never use a different currency symbol unless the user explicitly asks.

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

    private static final String FEW_SHOT_EXAMPLES = """

        Worked examples (follow these patterns):

        Example 1 — Stock question by product name
          User: "how many Coca Cola 500ml do we have?"
          You: call checkStockByProductSearch with query="Coca Cola 500ml".
          Then answer with the exact available figure and the warehouse count.

        Example 2 — General stock question
          User: "how much stock is?" / "show me stock"
          You: call getStockOverview.
          If the result note says no warehouses are configured, tell the user
          to create one in Settings → Warehouses before stock can be tracked.
          Otherwise list the top products and totals.

        Example 3 — Ambiguous request
          User: "email it to John"
          You: do NOT guess. Call askClarification with options including
          (a) which document/sale, (b) which John. Wait for the user's reply.

        Example 4 — How-to / teaching question
          User: "how do I add a new warehouse?" / "walk me through inventory"
          You: call teachModule with the relevant module slug
          (warehouses / inventory / etc.). Render the steps as a numbered list.

        Example 5 — Write action with concrete data
          User: "raise Coca-Cola price to 2,500"
          You: first call getProductDetail with query="Coca-Cola" to confirm
          the exact product and current price, then call updateProductPrice.
          The draft summary will show: "Coca-Cola 500ml: 2,000 → 2,500 TZS".
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
        String currency = resolveCurrency(jwt);

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(BASE_PROMPT, currency, lang));
        sb.append(FEW_SHOT_EXAMPLES);

        RoleProfile profile = RoleProfile.fromJwt(roles);
        sb.append("\n").append(profile.toneInstruction());
        sb.append("\nVerbosity: ").append(profile.verbosity());

        if (profile.isPlatformLevel()) {
            sb.append("\n").append(SUPER_ADMIN_EXTRA);
        }

        return sb.toString();
    }

    /**
     * Builds a dynamic context preamble with today's date, store info,
     * and intent hints. This goes into the messages array — never the
     * system prompt — so it doesn't break prompt caching.
     */
    public String buildDynamicContext(Jwt jwt, String language,
                                      IntentClassification intent,
                                      String conversationSummary) {
        return buildDynamicContext(jwt, language, intent, conversationSummary, null, null);
    }

    public String buildDynamicContext(Jwt jwt, String language,
                                      IntentClassification intent,
                                      String conversationSummary,
                                      java.util.Map<String, Object> pageContext) {
        return buildDynamicContext(jwt, language, intent, conversationSummary, pageContext, null);
    }

    @SuppressWarnings("unchecked")
    public String buildDynamicContext(Jwt jwt, String language,
                                      IntentClassification intent,
                                      String conversationSummary,
                                      java.util.Map<String, Object> pageContext,
                                      java.util.UUID tenantId) {
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

        // Per-tenant remembered facts (preferred warehouse, language, etc.)
        if (tenantId != null && tenantMemory != null) {
            var facts = tenantMemory.contextSlice(tenantId);
            if (!facts.isEmpty()) {
                ctx.append("\nRemembered facts: ");
                for (var f : facts) {
                    ctx.append(f.key()).append("=").append(f.value()).append("; ");
                }
            }
        }

        // Page context — the entity the user is currently looking at.
        // Lets "email this" / "refund this sale" work without ambiguity.
        if (pageContext != null && !pageContext.isEmpty()) {
            ctx.append("\nUI context: ");
            pageContext.forEach((k, v) -> ctx.append(k).append("=").append(v).append("; "));
            ctx.append("\nTreat 'this'/'it' in the user message as referring to the entity above.");
        }

        return ctx.toString();
    }

    /**
     * Resolves the currency to use in AI responses.
     * Checks JWT claims first, then platform settings, defaults to TZS.
     */
    private String resolveCurrency(Jwt jwt) {
        // Try JWT claim
        String currency = jwt.getClaimAsString("currency");
        if (currency != null && !currency.isBlank()) return currency;

        // Try system property (set via -Dplatform.tenant.currency=XXX)
        currency = System.getProperty("platform.tenant.currency");
        if (currency != null && !currency.isBlank()) return currency;

        // Default
        return "TZS (Tanzanian Shillings)";
    }
}
