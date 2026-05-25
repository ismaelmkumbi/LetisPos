package io.smartpos.ai.application;

import java.util.List;

public enum RoleProfile {

    CASHIER(
        "You are talking to a cashier at the front counter. Be FAST. " +
        "Focus only on sales, returns, stock checks, and customer lookup. " +
        "Do not discuss margins, finance, tenant settings, or other admin topics.",
        "concise — max 2-3 sentences or one action step",
        List.of("How much is X?", "Process a return", "Check stock of Y"),
        2
    ),
    MANAGER(
        "You are talking to a store manager. Balance data with action. " +
        "Cover sales, inventory, customers, basic finance, and team performance. " +
        "Do not discuss tenant billing or platform-level data.",
        "moderate — provide context and recommendations",
        List.of("How are sales today vs yesterday?", "Who's on leave this week?"),
        4
    ),
    OWNER(
        "You are talking to the store owner. Be insightful. " +
        "Lead with the headline metric, then context, then recommended action. " +
        "Include comparisons when showing numbers. " +
        "Proactively flag risks and opportunities. Think about margins, not just revenue. " +
        "You can discuss tenant settings (warehouses, taxes, billing plan) but NOT other tenants.",
        "detailed — show numbers, trends, and what to do about them",
        List.of("What's driving revenue this month?", "Which products have best margins?"),
        5
    ),
    TENANT_ADMIN(
        "You are talking to a tenant administrator. They manage this store's " +
        "users, roles, warehouses, payment configs, and integrations. " +
        "Be exact when explaining configuration steps. " +
        "You can teach them HOW the system works, including admin-only modules " +
        "(users, roles, warehouses, payment providers, document templates). " +
        "Do NOT expose other tenants' data — your scope is this tenant only.",
        "detailed with configuration depth",
        List.of("How do I add a new warehouse?", "Why can't the cashier see expenses?",
                "Walk me through setting up M-Pesa"),
        5
    ),
    PLATFORM_ADMIN(
        "You are talking to a PLATFORM administrator (Letis staff). You can query " +
        "across all tenants, see billing, system health, and onboarding state. " +
        "Be precise — your answers may drive support actions on real customers. " +
        "You can perform administrative writes without draft confirmation.",
        "detailed with platform-wide context",
        List.of("Show all tenants on trial", "Which tenant has highest sales?",
                "Why is tenant X on PAST_DUE?"),
        6
    ),
    // Retained as the legacy alias used by older JWTs; behaves as PLATFORM_ADMIN.
    SUPER_ADMIN(
        "You have SUPER_ADMIN access. You can query across all tenants " +
        "and perform administrative actions without draft confirmation.",
        "detailed with platform-wide context",
        List.of("Show all tenants on trial", "Which tenant has highest sales?"),
        6
    );

    private final String toneInstruction;
    private final String verbosity;
    private final List<String> examplePrompts;
    private final int maxToolRounds;

    RoleProfile(String toneInstruction, String verbosity,
                List<String> examplePrompts, int maxToolRounds) {
        this.toneInstruction = toneInstruction;
        this.verbosity = verbosity;
        this.examplePrompts = examplePrompts;
        this.maxToolRounds = maxToolRounds;
    }

    public String toneInstruction() { return toneInstruction; }
    public String verbosity() { return verbosity; }
    public List<String> examplePrompts() { return examplePrompts; }
    public int maxToolRounds() { return maxToolRounds; }

    /** True for roles allowed to query across tenants. */
    public boolean isPlatformLevel() {
        return this == PLATFORM_ADMIN || this == SUPER_ADMIN;
    }

    /** True for roles allowed to administer this tenant (users, warehouses, etc). */
    public boolean isTenantAdmin() {
        return this == TENANT_ADMIN || this == OWNER || isPlatformLevel();
    }

    /**
     * Resolve a role profile from JWT roles. The JWT may carry one or several
     * role strings — pick the most privileged. PLATFORM_ADMIN / SUPER_ADMIN
     * outrank tenant-level roles.
     */
    public static RoleProfile fromJwt(List<String> roles) {
        if (roles == null || roles.isEmpty()) return CASHIER;
        if (roles.contains("PLATFORM_ADMIN")) return PLATFORM_ADMIN;
        if (roles.contains("SUPER_ADMIN")) return SUPER_ADMIN;
        if (roles.contains("TENANT_ADMIN")) return TENANT_ADMIN;
        if (roles.contains("OWNER")) return OWNER;
        if (roles.contains("MANAGER")) return MANAGER;
        return CASHIER;
    }
}
