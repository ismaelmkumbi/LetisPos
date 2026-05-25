package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.api.dto.IntentClassification;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * v3 features: answer verifier, intent-aware tier routing data flow,
 * tenant memory store.
 */
class AssistantIntelligenceV3Test {

    // ── AnswerVerifier ────────────────────────────────────────────────────

    @Test
    void verifierAcceptsGroundedNumbers() {
        var results = List.of(new AssistantDtos.ToolResult(
            "metric", "Sales", Map.of("total", "1,500,000", "count", 42)));
        var v = AnswerVerifier.verify(
            "Gross sales for the period were 1,500,000 TZS across 42 transactions.",
            results);
        assertThat(v.grounded()).isTrue();
        assertThat(v.unverifiedNumbers()).isEmpty();
    }

    @Test
    void verifierFlagsInventedNumbers() {
        var results = List.of(new AssistantDtos.ToolResult(
            "metric", "Sales", Map.of("total", "1,500,000")));
        var v = AnswerVerifier.verify(
            "Sales were 1,500,000 TZS, up from 1,200,000 last month.",
            results);
        assertThat(v.grounded()).isFalse();
        assertThat(v.unverifiedNumbers()).contains("1,200,000");
    }

    @Test
    void verifierIgnoresSmallNumbers() {
        var results = List.of(new AssistantDtos.ToolResult(
            "ranking", "Top", Map.of("items", List.of(Map.of("name","A","value","999999")))));
        var v = AnswerVerifier.verify(
            "Top 5 customers, average basket of 999999 TZS — focus on the top 3.",
            results);
        // 5 and 3 are below MIN_INTERESTING, only 999999 is checked
        assertThat(v.grounded()).isTrue();
    }

    @Test
    void verifierIsNoOpOnEmptyAnswer() {
        var v = AnswerVerifier.verify("", List.of());
        assertThat(v.grounded()).isTrue();
        assertThat(v.totalNumbers()).isZero();
    }

    @Test
    void verifierGroundingScoreReflectsRatio() {
        var results = List.of(new AssistantDtos.ToolResult(
            "metric", "x", Map.of("a", "100000", "b", "200000")));
        var v = AnswerVerifier.verify(
            "Today 100000, yesterday 200000, projected 999999 tomorrow.", results);
        assertThat(v.totalNumbers()).isEqualTo(3);
        assertThat(v.unverifiedNumbers()).hasSize(1);
        assertThat(v.groundingScore()).isCloseTo(2.0 / 3, org.assertj.core.data.Offset.offset(0.01));
    }

    // ── TenantMemoryStore ─────────────────────────────────────────────────

    @Test
    void tenantMemoryStoresAndRecalls() {
        TenantMemoryStore mem = new TenantMemoryStore();
        UUID t = UUID.randomUUID();
        mem.remember(t, "preferred_language", "sw");
        assertThat(mem.recall(t, "preferred_language")).contains("sw");
    }

    @Test
    void tenantMemoryIsTenantScoped() {
        TenantMemoryStore mem = new TenantMemoryStore();
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        mem.remember(a, "k", "v");
        assertThat(mem.recall(b, "k")).isEmpty();
    }

    @Test
    void tenantMemoryExpiresAfterTtl() throws Exception {
        TenantMemoryStore mem = new TenantMemoryStore();
        UUID t = UUID.randomUUID();
        mem.remember(t, "k", "v", Duration.ofMillis(50));
        Thread.sleep(100);
        assertThat(mem.recall(t, "k")).isEmpty();
    }

    @Test
    void tenantMemoryContextSliceReturnsLimitedCount() {
        TenantMemoryStore mem = new TenantMemoryStore();
        UUID t = UUID.randomUUID();
        for (int i = 0; i < 12; i++) mem.remember(t, "k" + i, "v" + i);
        assertThat(mem.contextSlice(t)).hasSizeLessThanOrEqualTo(6);
    }

    @Test
    void tenantMemoryForgetRemovesFact() {
        TenantMemoryStore mem = new TenantMemoryStore();
        UUID t = UUID.randomUUID();
        mem.remember(t, "k", "v");
        mem.forget(t, "k");
        assertThat(mem.recall(t, "k")).isEmpty();
    }

    // ── IntentClassification routing data ─────────────────────────────────

    @Test
    void writeIntentsAreNotRoutedToCheapTier() {
        // Sanity: an "adjust stock" message should classify as INVENTORY + write,
        // so AiRouter.forIntent would not pick the cheap tier.
        IntentClassifierService classifier = new IntentClassifierService();
        IntentClassification intent = classifier.classify("adjust stock for Coke by -5");
        assertThat(intent.isWriteAction()).isTrue();
    }

    @Test
    void financeIntentsClassifyConfidently() {
        // The router skips FINANCE for the cheap tier — verify the classifier
        // can at least produce a non-write, high-confidence read for a clear
        // finance phrase. We don't pin the exact domain because revenue/sales
        // overlap is acceptable here.
        IntentClassifierService classifier = new IntentClassifierService();
        IntentClassification intent = classifier.classify("show me the tax summary for last month");
        assertThat(intent.primaryDomain()).isEqualTo(IntentClassification.Domain.FINANCE);
        assertThat(intent.isWriteAction()).isFalse();
    }

    @Test
    void simpleInventoryLookupClassifiesAsInventoryRead() {
        IntentClassifierService classifier = new IntentClassifierService();
        IntentClassification intent = classifier.classify("how many Coca-Cola do we have in stock?");
        assertThat(intent.primaryDomain()).isEqualTo(IntentClassification.Domain.INVENTORY);
        assertThat(intent.isWriteAction()).isFalse();
    }
}
