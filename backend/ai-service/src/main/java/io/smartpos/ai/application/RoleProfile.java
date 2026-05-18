package io.smartpos.ai.application;

import java.util.List;

public enum RoleProfile {

    CASHIER(
        "You are talking to a cashier at the front counter. Be FAST.",
        "concise — max 2-3 sentences or one action step",
        List.of("How much is X?", "Process a return", "Check stock of Y"),
        2
    ),
    MANAGER(
        "You are talking to a store manager. Balance data with action.",
        "moderate — provide context and recommendations",
        List.of("How are sales today vs yesterday?", "Who's on leave this week?"),
        4
    ),
    OWNER(
        "You are talking to the store owner. Be insightful. " +
        "Lead with the headline metric, then context, then recommended action. " +
        "Include comparisons when showing numbers. " +
        "Proactively flag risks and opportunities. Think about margins, not just revenue.",
        "detailed — show numbers, trends, and what to do about them",
        List.of("What's driving revenue this month?", "Which products have best margins?"),
        5
    ),
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

    @SuppressWarnings("unchecked")
    public static RoleProfile fromJwt(List<String> roles) {
        if (roles == null || roles.isEmpty()) return CASHIER;
        if (roles.contains("SUPER_ADMIN")) return SUPER_ADMIN;
        if (roles.contains("OWNER")) return OWNER;
        if (roles.contains("MANAGER")) return MANAGER;
        return CASHIER;
    }
}
