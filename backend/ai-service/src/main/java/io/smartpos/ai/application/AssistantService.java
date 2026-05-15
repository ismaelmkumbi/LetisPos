package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.api.dto.AssistantDtos.DraftResponse;
import io.smartpos.ai.api.dto.AssistantDtos.ToolResult;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.context.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
    private static final int MAX_TOOL_ROUNDS = 5;

    private final AiRouter aiRouter;
    private final AssistantPromptBuilder promptBuilder;
    private final AssistantToolCatalog toolCatalog;
    private final AssistantToolExecutor toolExecutor;
    private final AiInvocationRepository invocations;
    private final ObjectMapper om = new ObjectMapper();

    public AssistantService(AiRouter aiRouter, AssistantPromptBuilder promptBuilder,
                            AssistantToolCatalog toolCatalog,
                            AssistantToolExecutor toolExecutor,
                            AiInvocationRepository invocations) {
        this.aiRouter = aiRouter;
        this.promptBuilder = promptBuilder;
        this.toolCatalog = toolCatalog;
        this.toolExecutor = toolExecutor;
        this.invocations = invocations;
    }

    public SseEmitter chat(AssistantDtos.ChatRequest request, Jwt jwt, UUID userId) {
        UUID tenantId = TenantContext.require();
        String systemPrompt = promptBuilder.build(jwt, request.language());
        List<AssistantToolCatalog.ToolDef> tools = toolCatalog.scopedTools(jwt);
        String userMessage = request.message();
        @SuppressWarnings("unchecked")
        var roles = (List<String>) jwt.getClaims().get("roles");
        boolean isSuperAdmin = roles != null && roles.contains("SUPER_ADMIN");

        SseEmitter emitter = new SseEmitter(120_000L); // 2 minute timeout

        new Thread(() -> {
            try {
                processConversation(emitter, systemPrompt, userMessage, tools, userId, tenantId, 0, isSuperAdmin);
                emitter.complete();
            } catch (Exception e) {
                log.error("Assistant chat error", e);
                try {
                    emitter.send(SseEmitter.event()
                        .name("error")
                        .data(Map.of("message", e.getMessage(), "code", "INTERNAL")));
                    emitter.complete();
                } catch (IOException ignored) {
                    // client disconnected
                }
            }
        }).start();

        return emitter;
    }

    private void processConversation(SseEmitter emitter, String systemPrompt,
                                      String userMessage,
                                      List<AssistantToolCatalog.ToolDef> tools,
                                      UUID userId, UUID tenantId, int round,
                                      boolean isSuperAdmin) throws IOException {
        if (round >= MAX_TOOL_ROUNDS) {
            emitter.send(SseEmitter.event().name("done").data("{}"));
            return;
        }

        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();

        // Build the user prompt with tool definitions embedded
        String toolDefs = tools.isEmpty() ? "" : buildToolPrompt(tools);
        String fullPrompt = userMessage;
        if (!toolDefs.isEmpty()) {
            fullPrompt = "Available tools:\n" + toolDefs + "\n\nUser request: " + userMessage
                + "\n\nIf you need to use a tool, respond with a JSON object: "
                + "{\"tool_call\": {\"name\": \"<toolName>\", \"arguments\": {<args>}}}. "
                + "If you're just responding, write naturally.";
        }

        AiProvider.Result result;
        String error = null;
        try {
            result = provider.complete(systemPrompt, fullPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            result = new AiProvider.Result("I'm having trouble right now. Please try again.", null, null);
        }

        int duration = (int) (System.currentTimeMillis() - t0);

        // Log invocation
        invocations.save(AiInvocation.builder()
            .kind("ASSISTANT_CHAT")
            .provider(provider.name()).model(provider.model())
            .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
            .inputSummary(userMessage.substring(0, Math.min(200, userMessage.length())))
            .output(result.text()).error(error)
            .userId(userId).tenantId(tenantId)
            .durationMs(duration).build());

        // Parse response for tool calls
        String responseText = result.text();
        ToolCall parsed = parseToolCall(responseText);

        if (parsed != null) {
            // Send the text part (if any before the JSON)
            String textPart = responseText.substring(0, responseText.indexOf("{\"tool_call\"")).trim();
            if (!textPart.isEmpty()) {
                emitter.send(SseEmitter.event().name("token").data(Map.of("token", textPart)));
            }

            emitter.send(SseEmitter.event().name("tool_start")
                .data(Map.of("toolName", parsed.name)));

            AssistantToolCatalog.ToolDef tool = tools.stream()
                .filter(t -> t.name().equals(parsed.name)).findFirst().orElse(null);

            if (tool != null && tool.write()) {
                if (isSuperAdmin) {
                    // SUPER_ADMIN → execute immediately, no draft
                    try {
                        ToolResult toolResult = toolExecutor.execute(parsed.name, parsed.arguments, userId);
                        emitter.send(SseEmitter.event().name("tool_result")
                            .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                         "data", toolResult.data())));
                    } catch (Exception e) {
                        emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", e.getMessage(), "code", "TOOL_ERROR")));
                    }
                } else {
                    // Normal user → create draft for confirmation
                    String summary = "Execute " + parsed.name + " with " + parsed.arguments;
                    var draft = toolExecutor.createDraft(parsed.name, parsed.arguments,
                        summary, userId, tenantId);
                    emitter.send(SseEmitter.event().name("draft").data(Map.of(
                        "draftId", draft.getId().toString(),
                        "toolName", draft.getToolName(),
                        "summary", draft.getSummary(),
                        "toolInput", parsed.arguments)));
                }
            } else if (tool != null) {
                // Read tool — execute immediately
                try {
                    ToolResult toolResult = toolExecutor.execute(parsed.name, parsed.arguments, userId);
                    emitter.send(SseEmitter.event().name("tool_result")
                        .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                     "data", toolResult.data())));
                } catch (Exception e) {
                    emitter.send(SseEmitter.event().name("error")
                        .data(Map.of("message", e.getMessage(), "code", "TOOL_ERROR")));
                }
            } else {
                emitter.send(SseEmitter.event().name("error")
                    .data(Map.of("message", "Unknown tool: " + parsed.name, "code", "UNKNOWN_TOOL")));
            }
        } else {
            // No tool call — just stream the text
            emitter.send(SseEmitter.event().name("token").data(Map.of("token", responseText)));
        }

        emitter.send(SseEmitter.event().name("done").data("{}"));
    }

    public DraftResponse confirmDraft(UUID draftId, UUID userId) {
        ToolResult result = toolExecutor.executeDraft(draftId, userId);
        return new DraftResponse(draftId, "completed", "Action completed", Map.of());
    }

    public void rejectDraft(UUID draftId) {
        toolExecutor.rejectDraft(draftId);
    }

    // ── helpers ──

    private String buildToolPrompt(List<AssistantToolCatalog.ToolDef> tools) {
        StringBuilder sb = new StringBuilder();
        for (var tool : tools) {
            sb.append("- ").append(tool.name()).append(": ").append(tool.description()).append("\n");
            sb.append("  Parameters: ").append(tool.parameters()).append("\n");
        }
        return sb.toString();
    }

    private record ToolCall(String name, Map<String, Object> arguments) {}

    @SuppressWarnings("unchecked")
    private ToolCall parseToolCall(String text) {
        try {
            int start = text.indexOf("{\"tool_call\"");
            if (start < 0) return null;
            int end = text.lastIndexOf("}") + 1;
            String json = text.substring(start, end);
            Map<String, Object> parsed = om.readValue(json, Map.class);
            Map<String, Object> tc = (Map<String, Object>) parsed.get("tool_call");
            if (tc == null) return null;
            return new ToolCall(
                (String) tc.get("name"),
                (Map<String, Object>) tc.get("arguments"));
        } catch (Exception e) {
            return null;
        }
    }
}
