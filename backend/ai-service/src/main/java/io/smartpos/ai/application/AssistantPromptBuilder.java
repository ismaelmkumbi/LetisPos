package io.smartpos.ai.application;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class AssistantPromptBuilder {

    private static final String BASE_PROMPT = """
        You are LetisPOS Assistant, an AI helper for retail store management.

        Store context:
        - Store name: %s
        - Plan: %s
        - User role: %s
        - Today: %s
        - Currency: TZS

        You can access sales, inventory, products, customers, finance, HRM,
        and more. Use tools whenever you need real data.

        Rules:
        - Always use tools for factual questions about the store's data
        - Cite specific numbers and names from tool results
        - When a date range is unclear, choose the most useful recent range and say which range you used
        - Prefer charts for trends, rankings, comparisons, and proportions
        - Never invent business data; if the available tools cannot answer exactly, explain the closest available answer
        - For analytical answers, lead with the answer, then 2-3 supporting facts, then one recommended action
        - For write actions, explain what will happen before using the tool
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

    @SuppressWarnings("unchecked")
    public String build(Jwt jwt, String language) {
        String tenantName = jwt.getClaimAsString("tenantName");
        String billingPlan = jwt.getClaimAsString("billingPlan");
        var roles = (List<String>) jwt.getClaims().get("roles");
        String roleStr = roles != null && !roles.isEmpty()
            ? String.join(", ", roles) : "USER";

        String prompt = String.format(BASE_PROMPT,
            tenantName != null ? tenantName : "Unknown",
            billingPlan != null ? billingPlan : "STARTER",
            roleStr,
            LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
            language != null && language.equals("sw") ? "Swahili" : "English"
        );

        if (roles != null && roles.contains("SUPER_ADMIN")) {
            prompt += "\n" + SUPER_ADMIN_EXTRA;
        }

        return prompt;
    }
}
