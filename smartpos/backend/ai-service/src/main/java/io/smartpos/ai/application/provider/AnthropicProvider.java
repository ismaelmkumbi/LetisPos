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
 * Anthropic Messages API client. Uses the latest stable Claude Sonnet model
 * by default; override via {@code ANTHROPIC_MODEL}.
 *
 * Endpoint: POST https://api.anthropic.com/v1/messages
 *   headers: x-api-key, anthropic-version: 2023-06-01
 *   body: { "model": ..., "max_tokens": N, "system": "...", "messages": [{role, content}] }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnthropicProvider implements AiProvider {

    private static final String URL = "https://api.anthropic.com/v1/messages";
    private final AiProperties props;
    private final WebClient http = WebClient.builder().build();

    @Override public String name()  { return "anthropic"; }
    @Override public String model() { return props.anthropic().model(); }

    @Override
    public Result complete(String systemPrompt, String userPrompt) {
        if (props.anthropic().apiKey() == null || props.anthropic().apiKey().isBlank()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY not configured");
        }
        Map<String, Object> body = Map.of(
                "model", props.anthropic().model(),
                "max_tokens", props.anthropic().maxTokens(),
                "system", systemPrompt == null ? "" : systemPrompt,
                "messages", List.of(Map.of("role", "user", "content", userPrompt))
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = http.post()
                .uri(URL)
                .header("x-api-key", props.anthropic().apiKey())
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        if (resp == null) throw new IllegalStateException("Empty response from Anthropic");
        // Response shape: { content: [ { type:"text", text:"..." } ], usage: { input_tokens, output_tokens } }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) resp.get("content");
        StringBuilder out = new StringBuilder();
        if (content != null) {
            for (Map<String, Object> c : content) {
                if ("text".equals(c.get("type"))) out.append(c.get("text"));
            }
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
        Integer pTok = usage == null ? null : asInt(usage.get("input_tokens"));
        Integer cTok = usage == null ? null : asInt(usage.get("output_tokens"));
        return new Result(out.toString(), pTok, cTok);
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) return n.intValue();
        return null;
    }
}
