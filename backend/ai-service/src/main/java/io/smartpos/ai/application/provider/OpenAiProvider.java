package io.smartpos.ai.application.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * OpenAI Chat Completions client.
 * POST https://api.openai.com/v1/chat/completions
 *   Authorization: Bearer <key>
 *   body: { "model": ..., "messages": [{role,content}, ...] }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiProvider implements AiProvider {

    private static final String URL = "https://api.openai.com/v1/chat/completions";
    private final AiProperties props;
    private final WebClient http = WebClient.builder().build();

    @Override public String name()  { return "openai"; }
    @Override public String model() { return props.openai().model(); }

    @Override
    public Result complete(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, false);
    }

    @Override
    public Result completeJson(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, true);
    }

    private Result call(String systemPrompt, String userPrompt, boolean jsonMode) {
        if (props.openai().apiKey() == null || props.openai().apiKey().isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY not configured");
        }
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("model", props.openai().model());
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt == null ? "" : systemPrompt),
                Map.of("role", "user",   "content", userPrompt)));
        if (jsonMode) {
            // OpenAI strict JSON-object response mode (gpt-4o-mini, gpt-4o, etc.)
            body.put("response_format", Map.of("type", "json_object"));
            body.put("temperature", 0.2);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = http.post()
                .uri(URL)
                .header("Authorization", "Bearer " + props.openai().apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (resp == null) throw new IllegalStateException("Empty response from OpenAI");
        // choices[0].message.content
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
