package io.smartpos.ai.api.dto;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Result of classifying a user message before tool selection.
 * Produced by {@code IntentClassifierService} and consumed by
 * {@code AssistantPromptBuilder} and the orchestration pipeline
 * to narrow tools, inject domain-specific prompts, and resolve
 * time expressions.
 */
public record IntentClassification(
    Domain primaryDomain,
    Set<Domain> secondaryDomains,
    Language language,
    ResolvedTime time,
    boolean isWriteAction,
    List<String> keywords,
    double confidence
) {
    public enum Domain {
        SALES,
        INVENTORY,
        PRODUCTS,
        CUSTOMERS,
        FINANCE,
        HRM,
        HELP,
        PLATFORM_ADMIN,
        GENERAL
    }

    public enum Language {
        ENGLISH,
        SWAHILI,
        MIXED
    }

    /**
     * Resolved time expression from natural language.
     * When {@code type} is CUSTOM, {@code dateFrom} and {@code dateTo} are populated.
     */
    public record ResolvedTime(
        TimeType type,
        String dateFrom,
        String dateTo
    ) {
        public enum TimeType {
            TODAY,
            YESTERDAY,
            THIS_WEEK,
            LAST_WEEK,
            THIS_MONTH,
            /** Calendar last month — 1st to last day of previous month. */
            LAST_MONTH,
            /** Rolling 30-day window ending today. Distinct from LAST_MONTH. */
            LAST_30_DAYS,
            CUSTOM
        }

        /** {@code true} when the user specified an explicit time range. */
        public boolean isCustom() { return type == TimeType.CUSTOM; }
    }

    /** Convenience: create with only a primary domain. */
    public static IntentClassification of(Domain domain, Language language) {
        return new IntentClassification(domain, Set.of(), language,
            new ResolvedTime(ResolvedTime.TimeType.TODAY, null, null), false, List.of(), 0.5);
    }
}
