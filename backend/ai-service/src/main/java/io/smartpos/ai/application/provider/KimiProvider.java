package io.smartpos.ai.application.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;

/**
 * Kimi (Moonshot AI) Chat Completions client (OpenAI-compatible API).
 * POST https://api.moonshot.cn/v1/chat/completions
 *
 * Recommended models:
 *   - {@code moonshot-v1-8k}   — fast, general purpose
 *   - {@code moonshot-v1-32k}  — longer context
 *   - {@code moonshot-v1-128k} — very long context for document analysis
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KimiProvider implements AiProvider {

    private final AiProperties props;
    private final WebClient http = WebClient.builder().build();

    private boolean hasKey() {
        return props.kimi().apiKey() != null && !props.kimi().apiKey().isBlank();
    }

    @Override public String name()  { return "kimi"; }
    @Override public String model() { return props.kimi().model(); }

    @Override
    public Result complete(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, false);
    }

    @Override
    public Result completeJson(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, true);
    }

    private Result call(String systemPrompt, String userPrompt, boolean jsonMode) {
        if (!hasKey()) throw new IllegalStateException("KIMI_API_KEY not configured");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.kimi().model());
        body.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : ""),
            Map.of("role", "user", "content", userPrompt)));
        body.put("temperature", 0.2);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = http.post()
            .uri(props.kimi().baseUrl() + "/chat/completions")
            .header("Authorization", "Bearer " + props.kimi().apiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(60))
            .block();

        if (resp == null) throw new IllegalStateException("Empty response from Kimi");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
        String text = "";
        if (choices != null && !choices.isEmpty()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message != null) text = String.valueOf(message.get("content"));
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
        Integer pTok = usage == null ? null : asInt(usage.get("prompt_tokens"));
        Integer cTok = usage == null ? null : asInt(usage.get("completion_tokens"));
        return new Result(text, pTok, cTok);
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) return n.intValue();
        return null;
    }
}
