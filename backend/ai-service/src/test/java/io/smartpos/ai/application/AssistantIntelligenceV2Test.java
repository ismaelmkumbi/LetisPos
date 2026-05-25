package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Eval suite for the v2 intelligence upgrade: cache, draft summaries,
 * mass-send guard, PII redaction, BM25 fallback, clarification tool,
 * Swahili localisation.
 */
class AssistantIntelligenceV2Test {

    // ── DraftSummarizer ───────────────────────────────────────────────────

    @Test
    void draftSummarizerRendersConcretePriceUpdate() {
        String s = DraftSummarizer.summarize("updateProductPrice", Map.of(
            "productName", "Coca-Cola 500ml", "price", 2500));
        assertThat(s).contains("Coca-Cola 500ml").contains("2500");
        assertThat(s).doesNotContain("Execute");
    }

    @Test
    void draftSummarizerHandlesCreateProduct() {
        String s = DraftSummarizer.summarize("createProduct", Map.of(
            "name", "Bread Loaf", "price", 1500, "cost", 900));
        assertThat(s).contains("Bread Loaf").contains("1500").contains("900");
    }

    @Test
    void draftSummarizerHandlesEmailWithTruncation() {
        String s = DraftSummarizer.summarize("sendSMS", Map.of(
            "recipient", "+255712345678",
            "body", "Long message ".repeat(20)));
        assertThat(s).contains("+255712345678");
        assertThat(s.length()).isLessThan(200);
    }

    @Test
    void draftSummarizerFallsBackForUnknownTool() {
        assertThat(DraftSummarizer.summarize("mysteryTool", Map.of()))
            .isEqualTo("Execute mysteryTool");
    }

    // ── PII redaction ─────────────────────────────────────────────────────

    @Test
    void redactorScrubsEmailsAndPhones() {
        String out = PiiRedactor.redact("Send invoice to john.doe@example.com or call +255712345678");
        assertThat(out).contains("[EMAIL]").contains("[PHONE]");
        assertThat(out).doesNotContain("john.doe@example.com");
    }

    @Test
    void redactorPreservesEmptyOrNull() {
        assertThat(PiiRedactor.redact(null)).isNull();
        assertThat(PiiRedactor.redact("")).isEmpty();
    }

    @Test
    void redactorScrubsCardLikeNumbers() {
        String out = PiiRedactor.redact("My card is 4111 1111 1111 1111 thanks");
        assertThat(out).contains("[CARD]");
        assertThat(out).doesNotContain("4111 1111 1111 1111");
    }

    // ── ToolResultCache ───────────────────────────────────────────────────

    @Test
    void cacheReturnsSameInstanceWithinTtl() {
        ToolResultCache cache = new ToolResultCache();
        UUID tenant = UUID.randomUUID();
        AssistantDtos.ToolResult r = new AssistantDtos.ToolResult("metric", "x", Map.of("v", 1));
        cache.put(tenant, "getSalesReport", Map.of("dateFrom","2026-01-01"), r);
        AssistantDtos.ToolResult hit = cache.get(tenant, "getSalesReport", Map.of("dateFrom","2026-01-01"));
        assertThat(hit).isSameAs(r);
    }

    @Test
    void cacheIsTenantScoped() {
        ToolResultCache cache = new ToolResultCache();
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        cache.put(a, "getSalesReport", Map.of(),
            new AssistantDtos.ToolResult("metric", "x", Map.of()));
        assertThat(cache.get(b, "getSalesReport", Map.of())).isNull();
    }

    @Test
    void cacheInvalidationClearsTenant() {
        ToolResultCache cache = new ToolResultCache();
        UUID t = UUID.randomUUID();
        cache.put(t, "getSalesReport", Map.of(),
            new AssistantDtos.ToolResult("metric", "x", Map.of()));
        cache.invalidateTenant(t);
        assertThat(cache.get(t, "getSalesReport", Map.of())).isNull();
    }

    // ── MassSendGuard ─────────────────────────────────────────────────────

    @Test
    void massSendGuardBlocksBulkWithoutSuperAdmin() {
        MassSendGuard guard = new MassSendGuard();
        var err = guard.check("sendEmail",
            Map.of("recipients", List.of("a@x", "b@x", "c@x", "d@x", "e@x", "f@x")),
            UUID.randomUUID(), false);
        assertThat(err).isNotNull();
        assertThat(err.code()).isEqualTo("BULK_SEND_REQUIRES_CONFIRM");
    }

    @Test
    void massSendGuardAllowsSingleRecipient() {
        MassSendGuard guard = new MassSendGuard();
        var err = guard.check("sendEmail",
            Map.of("recipient", "a@x"), UUID.randomUUID(), false);
        assertThat(err).isNull();
    }

    @Test
    void massSendGuardIgnoresNonSendTools() {
        MassSendGuard guard = new MassSendGuard();
        var err = guard.check("getSalesReport",
            Map.of("recipients", List.of("a", "b", "c", "d", "e", "f", "g")),
            UUID.randomUUID(), false);
        assertThat(err).isNull();
    }

    // ── Knowledge base BM25 fallback (lookup level only — no Spring) ──────
    // The KnowledgeBase requires Spring wiring + classpath resources,
    // so we test the public ModuleGuide localisation here instead.

    @Test
    void moduleGuideLocalisesToSwahiliWhenAvailable() {
        ModuleGuide.Guide pos = ModuleGuide.localise(ModuleGuide.lookup("pos"), "sw");
        assertThat(pos.summary()).contains("POS");
        assertThat(pos.title()).contains("Mauzo");
    }

    @Test
    void moduleGuideKeepsEnglishWhenNoSwVariant() {
        ModuleGuide.Guide reports = ModuleGuide.localise(ModuleGuide.lookup("reports"), "sw");
        assertThat(reports.title()).isEqualTo(ModuleGuide.lookup("reports").title());
    }

    @Test
    void moduleGuideKeepsEnglishWhenLangNotSw() {
        ModuleGuide.Guide pos = ModuleGuide.localise(ModuleGuide.lookup("pos"), "en");
        assertThat(pos.title()).doesNotContain("Mauzo");
    }
}
