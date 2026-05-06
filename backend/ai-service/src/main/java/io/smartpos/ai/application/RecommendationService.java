package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.ReportAiDtos;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final AiRouter aiRouter;
    private final AiInvocationRepository invocations;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYS_RECOMMEND = """
            You are a retail business advisor for a POS/ERP system. Given report data
            as JSON, generate 3-5 concrete, actionable recommendations.
            Return a JSON object:

            {
              "recommendations": [
                {
                  "title": "string (short action title)",
                  "description": "string (1-2 sentences explaining the action)",
                  "category": "INVENTORY"|"PRICING"|"SALES"|"COST"|"GENERAL",
                  "priority": "LOW"|"MEDIUM"|"HIGH"
                }
              ]
            }

            Rules:
            - Each recommendation must be specific, actionable, and data-backed.
            - Reference actual figures from the data when possible.
            - Priority: HIGH = do this week, MEDIUM = do this month, LOW = consider.
            - Output ONLY the JSON object — no commentary, no markdown.
            """;

    public ReportAiDtos.RecommendationResponse recommend(ReportAiDtos.RecommendationRequest req, UUID userId) {
        AiProvider provider = aiRouter.active();
        String userPrompt = "Report kind: " + req.reportKind() + "\nFacts (JSON):\n" + req.factsJson();

        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_RECOMMEND, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("Recommendation generation failed: {}", error);
            result = new AiProvider.Result("{\"recommendations\":[]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("RECOMMENDATIONS").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("recommend " + req.reportKind())
                .output(truncate(result.text(), 2000)).error(error)
                .userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        List<ReportAiDtos.RecommendationResponse.Recommendation> recs = new ArrayList<>();
        try {
            JsonNode root = MAPPER.readTree(stripFences(result.text()));
            if (root.has("recommendations") && root.get("recommendations").isArray()) {
                for (JsonNode r : root.get("recommendations")) {
                    recs.add(new ReportAiDtos.RecommendationResponse.Recommendation(
                            r.path("title").asText(""),
                            r.path("description").asText(""),
                            r.path("category").asText("GENERAL"),
                            r.path("priority").asText("MEDIUM")));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse recommendation JSON: {}", e.getMessage());
        }

        return new ReportAiDtos.RecommendationResponse(recs, provider.name(), provider.model(), Instant.now());
    }

    private static String stripFences(String s) {
        if (s == null) return "{}";
        String t = s.trim();
        if (t.startsWith("```")) {
            int start = t.indexOf('\n');
            int end = t.lastIndexOf("```");
            if (start >= 0 && end > start) t = t.substring(start + 1, end);
        }
        return t;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
