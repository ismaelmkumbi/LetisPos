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
 * OpenAI Chat Completions client.
 * POST https://api.openai.com/v1/chat/completions
 *   Authorization: Bearer <key>
 *   body: { "model": ..., "messages": [{role,content}, ...] }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiProvider implements AiProvider {

    private final AiProperties props;
    private final WebClient http = WebClient.builder().build();

    private String url() { return props.openai().baseUrl() + "/chat/completions"; }

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

    /**
     * Vision call. Uses the same JSON-mode response format, but the user
     * message becomes a multi-part content array per OpenAI's vision API:
     *   [ {type:"text", text:"..."},
     *     {type:"image_url", image_url:{url:"data:image/jpeg;base64,..."}} ]
     * Requires a model that supports images (gpt-4o-mini and gpt-4o do).
     */
    @Override
    public Result completeJsonWithImages(String systemPrompt, String userPrompt, List<String> imageDataUrls) {
        if (props.openai().apiKey() == null || props.openai().apiKey().isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY not configured");
        }
        java.util.List<Map<String, Object>> userContent = new java.util.ArrayList<>();
        userContent.add(Map.of("type", "text", "text", userPrompt));
        for (String url : imageDataUrls) {
            // "high" detail needed for OCR of product lists, price sheets, etc.
            userContent.add(Map.of("type", "image_url",
                    "image_url", Map.of("url", url, "detail", "high")));
        }

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("model", props.openai().model());
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt == null ? "" : systemPrompt),
                Map.of("role", "user",   "content", userContent)));
        body.put("response_format", Map.of("type", "json_object"));
        body.put("temperature", 0.2);
        return execute(body);
    }

    @Override
    public ToolCallResult completeWithTools(String systemPrompt, String userPrompt,
                                             List<Map<String, Object>> tools) {
        // Build single-turn messages list from pair
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", userPrompt));
        return completeWithTools(systemPrompt, messages, tools);
    }

    @Override
    public ToolCallResult completeWithTools(String systemPrompt,
                                             List<Map<String, Object>> messages,
                                             List<Map<String, Object>> tools) {
        return completeWithTools(systemPrompt, messages, tools, false);
    }

    @Override
    public ToolCallResult completeWithTools(String systemPrompt,
                                             List<Map<String, Object>> messages,
                                             List<Map<String, Object>> tools,
                                             boolean forceTools) {
        if (props.openai().apiKey() == null || props.openai().apiKey().isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY not configured");
        }
        Map<String, Object> body = new HashMap<>();
        body.put("model", props.openai().model());
        // Prepend system message to messages array
        List<Map<String, Object>> fullMessages = new ArrayList<>();
        fullMessages.add(Map.of("role", "system", "content",
            systemPrompt != null ? systemPrompt : ""));
        fullMessages.addAll(messages);
        body.put("messages", fullMessages);
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
            body.put("tool_choice", forceTools ? "required" : "auto");
        }
        return executeToolCall(body);
    }

    @SuppressWarnings("unchecked")
    private ToolCallResult executeToolCall(Map<String, Object> body) {
        Map<String, Object> resp = http.post()
                .uri(url())
                .header("Authorization", "Bearer " + props.openai().apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (resp == null) throw new IllegalStateException("Empty response from OpenAI");

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
        return execute(body);
    }

    private Result execute(Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = http.post()
                .uri(url())
                .header("Authorization", "Bearer " + props.openai().apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (resp == null) throw new IllegalStateException("Empty response from OpenAI");
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
