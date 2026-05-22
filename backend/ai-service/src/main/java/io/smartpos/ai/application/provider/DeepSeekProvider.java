package io.smartpos.ai.application.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DeepSeek client.
 *
 * DeepSeek exposes an OpenAI-compatible Chat Completions API at
 * {@code https://api.deepseek.com/v1/chat/completions}, so the request /
 * response shape mirrors {@link OpenAiProvider}. This class is intentionally
 * a sibling rather than a subclass so each provider can evolve independently
 * (different defaults, error handling, model naming, etc.).
 *
 * Recommended models:
 *   - {@code deepseek-chat}     — DeepSeek-V3, fast & cheap, used for our
 *                                 product-suggest / import-map flows.
 *   - {@code deepseek-reasoner} — DeepSeek-R1, slower/expensive, only
 *                                 worth it for complex reasoning.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeepSeekProvider implements AiProvider {

    private final AiProperties props;
    private final WebClient http = WebClient.builder().build();

    @Override public String name()  { return "deepseek"; }
    @Override public String model() { return props.deepseek().model(); }

    @Override
    public Result complete(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, false);
    }

    @Override
    public Result completeJson(String systemPrompt, String userPrompt) {
        return call(systemPrompt, userPrompt, true);
    }

    private Result call(String systemPrompt, String userPrompt, boolean jsonMode) {
        if (props.deepseek().apiKey() == null || props.deepseek().apiKey().isBlank()) {
            throw new IllegalStateException("DEEPSEEK_API_KEY not configured");
        }
        Map<String, Object> body = new HashMap<>();
        body.put("model", props.deepseek().model());
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt == null ? "" : systemPrompt),
                Map.of("role", "user",   "content", userPrompt)));
        if (jsonMode) {
            // DeepSeek supports OpenAI-compatible strict JSON-object response mode.
            body.put("response_format", Map.of("type", "json_object"));
            body.put("temperature", 0.2);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = http.post()
                .uri(props.deepseek().baseUrl() + "/chat/completions")
                .header("Authorization", "Bearer " + props.deepseek().apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (resp == null) throw new IllegalStateException("Empty response from DeepSeek");
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

    @Override
    public ToolCallResult completeWithTools(String systemPrompt, String userPrompt,
                                             List<Map<String, Object>> tools) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", userPrompt));
        return completeWithTools(systemPrompt, messages, tools);
    }

    @Override
    @SuppressWarnings("unchecked")
    public ToolCallResult completeWithTools(String systemPrompt,
                                             List<Map<String, Object>> messages,
                                             List<Map<String, Object>> tools) {
        if (props.deepseek().apiKey() == null || props.deepseek().apiKey().isBlank()) {
            throw new IllegalStateException("DEEPSEEK_API_KEY not configured");
        }
        Map<String, Object> body = new HashMap<>();
        body.put("model", props.deepseek().model());
        List<Map<String, Object>> fullMessages = new ArrayList<>();
        fullMessages.add(Map.of("role", "system", "content",
            systemPrompt != null ? systemPrompt : ""));
        fullMessages.addAll(messages);
        body.put("messages", fullMessages);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
            body.put("tool_choice", "auto");
        }

        Map<String, Object> resp = http.post()
                .uri(props.deepseek().baseUrl() + "/chat/completions")
                .header("Authorization", "Bearer " + props.deepseek().apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (resp == null) throw new IllegalStateException("Empty response from DeepSeek");

        List<Map<String, Object>> choices =
            (List<Map<String, Object>>) resp.get("choices");
        String text = "";
        List<ToolCall> toolCalls = List.of();

        if (choices != null && !choices.isEmpty()) {
            Map<String, Object> message =
                (Map<String, Object>) choices.get(0).get("message");
            if (message != null) {
                Object content = message.get("content");
                if (content != null) text = String.valueOf(content);

                List<Map<String, Object>> rawCalls =
                    (List<Map<String, Object>>) message.get("tool_calls");
                if (rawCalls != null) {
                    toolCalls = new ArrayList<>();
                    for (var rc : rawCalls) {
                        Map<String, Object> fn =
                            (Map<String, Object>) rc.get("function");
                        toolCalls.add(new ToolCall(
                            String.valueOf(rc.get("id")),
                            fn != null ? String.valueOf(fn.get("name")) : "",
                            fn != null ? String.valueOf(fn.get("arguments")) : "{}"));
                    }
                }
            }
        }

        Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
        Integer pTok = usage == null ? null : asInt(usage.get("prompt_tokens"));
        Integer cTok = usage == null ? null : asInt(usage.get("completion_tokens"));
        return new ToolCallResult(text, toolCalls, pTok, cTok);
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) return n.intValue();
        return null;
    }
}
