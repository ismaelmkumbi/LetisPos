package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.ai.infrastructure.feign.ReportFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Domain prompts for the AI service.
 *
 *   salesTrend      → fetches summary + top-N from report-service, asks the
 *                      LLM for a 4-bullet executive narrative.
 *   narrateReport   → caller-supplied facts (any report) → narrate.
 *   chat            → free-form Q&A with an optional system prompt.
 *
 * Every call is logged to {@code ai_invocations} for billing and audit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InsightService {

    private final AiRouter aiRouter;
    private final ReportFeign reportFeign;
    private final AiInvocationRepository invocations;

    private static final String SYS_NUMERIC = """
            You are SmartPOS's analyst. You will be given retail KPIs as JSON or short
            text. Respond in 4-6 short bullet points: (1) headline, (2) what's working,
            (3) what's at risk, (4) one concrete action. Use the figures verbatim — do
            NOT invent numbers. Output plain text, no markdown headings.
            """;

    public AiDtos.InsightResponse salesTrend(AiDtos.SalesTrendRequest req, UUID userId) {
        ReportFeign.SalesSummary summary = reportFeign.salesSummary(req.dateFrom(), req.dateTo(), req.warehouseId(), null);
        List<ReportFeign.TopProduct> topProducts = reportFeign.topProducts(req.dateFrom(), req.dateTo(), req.warehouseId(), 5);
        List<ReportFeign.TopCustomer> topCustomers = reportFeign.topCustomers(req.dateFrom(), req.dateTo(), 5);

        String tone = req.tone() == null ? "executive" : req.tone();
        String userPrompt = """
            Period: %s to %s
            Tone: %s

            Summary:
            %s

            Top products:
            %s

            Top customers:
            %s
            """.formatted(req.dateFrom(), req.dateTo(), tone, summary, topProducts, topCustomers);

        return invoke("SALES_TREND", SYS_NUMERIC, userPrompt, userId,
                "sales-trend " + req.dateFrom() + "..." + req.dateTo());
    }

    public AiDtos.InsightResponse narrate(AiDtos.NarrateRequest req, UUID userId) {
        String prompt = """
            Report kind: %s
            Question: %s

            Facts (JSON):
            %s
            """.formatted(req.reportKind(),
                          req.question() == null ? "Provide a concise narrative." : req.question(),
                          req.factsJson());
        return invoke("NARRATE_REPORT", SYS_NUMERIC, prompt, userId, "narrate " + req.reportKind());
    }

    public AiDtos.InsightResponse chat(AiDtos.ChatRequest req, UUID userId) {
        String sys = req.systemPrompt() == null ? "You are a helpful retail-analytics assistant for a POS / ERP system."
                                                : req.systemPrompt();
        return invoke("CHAT", sys, req.prompt(), userId,
                req.prompt().substring(0, Math.min(80, req.prompt().length())));
    }

    // ----------------------------------------------------------------
    private AiDtos.InsightResponse invoke(String kind, String system, String user,
                                          UUID userId, String inputSummary) {
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.complete(system, user);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} failed: {}", provider.name(), error);
            result = new AiProvider.Result("Unable to generate insight: " + error, 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind(kind).provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens())
                .completionTokens(result.completionTokens())
                .inputSummary(inputSummary)
                .output(result.text())
                .error(error)
                .userId(userId)
                .durationMs(duration)
                .build());

        return new AiDtos.InsightResponse(result.text(), provider.name(), provider.model(),
                result.promptTokens(), result.completionTokens(), Instant.now());
    }
}
