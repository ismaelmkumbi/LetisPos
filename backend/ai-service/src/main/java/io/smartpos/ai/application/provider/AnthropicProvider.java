package io.smartpos.ai.application.provider;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
    private final ObjectMapper om = new ObjectMapper();
    private final WebClient http = WebClient.builder().build();

    @Override public String name()  { return "anthropic"; }
    @Override public String model() { return props.anthropic().model(); }

    @Override
    public Result complete(String systemPrompt, String userPrompt) {
        if (props.anthropic().apiKey() == null || props.anthropic().apiKey().isBlank()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY not configured");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.anthropic().model());
        body.put("max_tokens", props.anthropic().maxTokens());
        // System prompt as list with cache_control so tools + system are cached
        body.put("system", systemPrompt != null && !systemPrompt.isBlank()
            ? List.of(Map.of("type", "text", "text", systemPrompt,
                             "cache_control", Map.of("type", "ephemeral")))
            : List.of(Map.of("type", "text", "text", "")));
        body.put("messages", List.of(Map.of("role", "user", "content", userPrompt)));
        body.put("thinking", Map.of("type", "adaptive"));
        body.put("output_config", Map.of("effort", "high"));

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

        String stopReason = (String) resp.get("stop_reason");
        if ("max_tokens".equals(stopReason)) {
            log.warn("Anthropic response truncated — max_tokens={} reached", props.anthropic().maxTokens());
        } else if ("refusal".equals(stopReason)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> sd = (Map<String, Object>) resp.get("stop_details");
            log.warn("Anthropic refusal: {}", sd != null ? sd.get("explanation") : "no details");
            return new Result("I'm unable to respond to that request.", null, null);
        }

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

    @Override
    @SuppressWarnings("unchecked")
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
        if (props.anthropic().apiKey() == null || props.anthropic().apiKey().isBlank()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY not configured");
        }

        // Convert OpenAI-format tools to Anthropic-format tools
        List<Map<String, Object>> anthropicTools = new ArrayList<>();
        for (Map<String, Object> tool : tools) {
            Map<String, Object> fn = (Map<String, Object>) tool.get("function");
            if (fn != null) {
                Map<String, Object> at = new LinkedHashMap<>();
                at.put("name", fn.get("name"));
                at.put("description", fn.get("description"));
                at.put("input_schema", fn.get("parameters"));
                anthropicTools.add(at);
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.anthropic().model());
        body.put("max_tokens", props.anthropic().maxTokens());
        body.put("system", systemPrompt != null && !systemPrompt.isBlank()
            ? List.of(Map.of("type", "text", "text", systemPrompt,
                             "cache_control", Map.of("type", "ephemeral")))
            : List.of(Map.of("type", "text", "text", "")));
        body.put("messages", messages);
        body.put("tools", anthropicTools);
        body.put("thinking", Map.of("type", "adaptive"));
        body.put("output_config", Map.of("effort", "high"));

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

        String stopReason = (String) resp.get("stop_reason");
        if ("max_tokens".equals(stopReason)) {
            log.warn("Anthropic tool-call response truncated — max_tokens={}",
                props.anthropic().maxTokens());
        } else if ("refusal".equals(stopReason)) {
            @SuppressWarnings("unchecked")
            Map<String, Object> sd = (Map<String, Object>) resp.get("stop_details");
            log.warn("Anthropic tool-use refusal: {}", sd != null ? sd.get("explanation") : "no details");
            return new ToolCallResult("I'm unable to respond to that request.", List.of(), null, null);
        }

        StringBuilder text = new StringBuilder();
        List<ToolCall> toolCalls = new ArrayList<>();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> content = (List<Map<String, Object>>) resp.get("content");
        if (content != null) {
            for (Map<String, Object> block : content) {
                String type = (String) block.get("type");
                if ("text".equals(type)) {
                    text.append(block.get("text"));
                } else if ("tool_use".equals(type)) {
                    String id = (String) block.get("id");
                    String name = (String) block.get("name");
                    Map<String, Object> input = (Map<String, Object>) block.get("input");
                    String args = "{}";
                    try {
                        args = om.writeValueAsString(input != null ? input : Map.of());
                    } catch (JsonProcessingException ignored) {}
                    toolCalls.add(new ToolCall(id, name, args));
                }
            }
        }

        Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
        Integer pTok = usage == null ? null : asInt(usage.get("input_tokens"));
        Integer cTok = usage == null ? null : asInt(usage.get("output_tokens"));
        return new ToolCallResult(text.toString(), toolCalls, pTok, cTok);
    }

    @Override
    @SuppressWarnings("unchecked")
    public ToolCallResult completeWithToolsStreaming(String systemPrompt,
                                                     List<Map<String, Object>> messages,
                                                     List<Map<String, Object>> tools,
                                                     TokenCallback onToken) {
        if (props.anthropic().apiKey() == null || props.anthropic().apiKey().isBlank()) {
            throw new IllegalStateException("ANTHROPIC_API_KEY not configured");
        }

        // Convert OpenAI-format tools to Anthropic-format tools
        List<Map<String, Object>> anthropicTools = new ArrayList<>();
        for (Map<String, Object> tool : tools) {
            Map<String, Object> fn = (Map<String, Object>) tool.get("function");
            if (fn != null) {
                Map<String, Object> at = new LinkedHashMap<>();
                at.put("name", fn.get("name"));
                at.put("description", fn.get("description"));
                at.put("input_schema", fn.get("parameters"));
                anthropicTools.add(at);
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.anthropic().model());
        body.put("max_tokens", props.anthropic().maxTokens());
        body.put("system", systemPrompt != null && !systemPrompt.isBlank()
            ? List.of(Map.of("type", "text", "text", systemPrompt,
                             "cache_control", Map.of("type", "ephemeral")))
            : List.of(Map.of("type", "text", "text", "")));
        body.put("messages", messages);
        body.put("tools", anthropicTools);
        body.put("thinking", Map.of("type", "adaptive"));
        body.put("output_config", Map.of("effort", "high"));
        body.put("stream", true);

        // Collect SSE lines into a single string, then parse
        String fullResponse = http.post()
            .uri(URL)
            .header("x-api-key", props.anthropic().apiKey())
            .header("anthropic-version", "2023-06-01")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(body)
            .retrieve()
            .bodyToFlux(String.class)
            .timeout(Duration.ofSeconds(120))
            .collectList()
            .map(lines -> String.join("\n", lines))
            .block();

        if (fullResponse == null) throw new IllegalStateException("Empty streaming response");

        // Parse SSE events to extract text deltas, tool uses, and usage
        StringBuilder text = new StringBuilder();
        List<ToolCall> toolCalls = new ArrayList<>();
        Integer pTok = null;
        Integer cTok = null;
        StringBuilder currentToolName = new StringBuilder();
        StringBuilder currentToolArgs = new StringBuilder();
        String currentToolId = null;
        String stopReason = null;

        for (String line : fullResponse.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            String json = line.substring(6);
            Map<String, Object> event;
            try {
                event = om.readValue(json, Map.class);
            } catch (JsonProcessingException e) {
                continue;
            }
            String type = (String) event.get("type");

            switch (type) {
                case "content_block_delta" -> {
                    Map<String, Object> delta = (Map<String, Object>) event.get("delta");
                    if (delta == null) break;
                    String deltaType = (String) delta.get("type");
                    if ("text_delta".equals(deltaType)) {
                        String token = (String) delta.get("text");
                        if (token != null) {
                            text.append(token);
                            onToken.onToken(token);
                        }
                    } else if ("input_json_delta".equals(deltaType)) {
                        String partial = (String) delta.get("partial_json");
                        if (partial != null) currentToolArgs.append(partial);
                    }
                }
                case "content_block_start" -> {
                    Map<String, Object> cb = (Map<String, Object>) event.get("content_block");
                    if (cb != null && "tool_use".equals(cb.get("type"))) {
                        currentToolId = (String) cb.get("id");
                        currentToolName.setLength(0);
                        currentToolName.append((String) cb.get("name"));
                        currentToolArgs.setLength(0);
                    }
                }
                case "content_block_stop" -> {
                    if (currentToolId != null) {
                        toolCalls.add(new ToolCall(currentToolId,
                            currentToolName.toString(), currentToolArgs.toString()));
                        currentToolId = null;
                    }
                }
                case "message_delta" -> {
                    Map<String, Object> d = (Map<String, Object>) event.get("delta");
                    if (d != null) stopReason = (String) d.get("stop_reason");
                    Map<String, Object> u = (Map<String, Object>) event.get("usage");
                    if (u != null) {
                        cTok = asInt(u.get("output_tokens"));
                    }
                }
                case "message_start" -> {
                    Map<String, Object> msg = (Map<String, Object>) event.get("message");
                    if (msg != null) {
                        Map<String, Object> u = (Map<String, Object>) msg.get("usage");
                        if (u != null) pTok = asInt(u.get("input_tokens"));
                    }
                }
            }
        }

        if ("max_tokens".equals(stopReason)) {
            log.warn("Anthropic streaming response truncated — max_tokens={}",
                props.anthropic().maxTokens());
        }

        return new ToolCallResult(text.toString(), toolCalls, pTok, cTok);
    }

    private static Integer asInt(Object v) {
        if (v instanceof Number n) return n.intValue();
        return null;
    }
}
