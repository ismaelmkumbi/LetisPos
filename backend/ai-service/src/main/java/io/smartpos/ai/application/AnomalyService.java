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
public class AnomalyService {

    private final AiRouter aiRouter;
    private final AiInvocationRepository invocations;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYS_ANOMALY = """
            You are a retail analytics anomaly detector. Given report data as JSON,
            identify unusual patterns, outliers, or concerning trends.
            Return a JSON object with an "anomalies" array:

            {
              "anomalies": [
                {
                  "metric": "string",
                  "description": "string",
                  "severity": "LOW"|"MEDIUM"|"HIGH",
                  "expectedRange": "string (what's normal)",
                  "actualValue": "string (what was observed)"
                }
              ]
            }

            Rules:
            - Only flag genuine anomalies — don't invent problems.
            - If nothing looks unusual, return an empty anomalies array.
            - severity: LOW = minor variance, MEDIUM = notable deviation, HIGH = needs immediate attention.
            - Output ONLY the JSON object — no commentary, no markdown.
            """;

    public ReportAiDtos.AnomalyResponse detect(ReportAiDtos.AnomalyRequest req, UUID userId) {
        AiProvider provider = aiRouter.active();
        String userPrompt = "Report kind: " + req.reportKind() + "\nFacts (JSON):\n" + req.factsJson();

        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_ANOMALY, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("Anomaly detection failed: {}", error);
            result = new AiProvider.Result("{\"anomalies\":[]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("ANOMALY_DETECT").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("anomalies " + req.reportKind())
                .output(truncate(result.text(), 2000)).error(error)
                .userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        List<ReportAiDtos.AnomalyResponse.Anomaly> anomalies = new ArrayList<>();
        try {
            JsonNode root = MAPPER.readTree(stripFences(result.text()));
            if (root.has("anomalies") && root.get("anomalies").isArray()) {
                for (JsonNode a : root.get("anomalies")) {
                    anomalies.add(new ReportAiDtos.AnomalyResponse.Anomaly(
                            a.path("metric").asText(""),
                            a.path("description").asText(""),
                            a.path("severity").asText("LOW"),
                            a.path("expectedRange").asText(""),
                            a.path("actualValue").asText("")));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse anomaly JSON: {}", e.getMessage());
        }

        return new ReportAiDtos.AnomalyResponse(anomalies, provider.name(), provider.model(), Instant.now());
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
