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

        // Capture auth for background thread
        String jwtToken = jwt.getTokenValue();
        var securityCtx = org.springframework.security.core.context.SecurityContextHolder.getContext();

        SseEmitter emitter = new SseEmitter(120_000L); // 2 minute timeout

        new Thread(() -> {
            try {
                // Propagate security context to background thread for Feign calls
                org.springframework.security.core.context.SecurityContextHolder.setContext(securityCtx);
                TenantContext.set(tenantId);
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
            } finally {
                TenantContext.clear();
                SecurityContextHolder.clearContext();
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

        // Build OpenAI function-calling tool definitions
        List<Map<String, Object>> openAiTools = tools.stream()
            .map(this::toOpenAiTool)
            .toList();

        AiProvider.ToolCallResult result;
        String error = null;
        try {
            result = provider.completeWithTools(systemPrompt, userMessage,
                openAiTools.isEmpty() ? null : openAiTools);
        } catch (Exception e) {
            log.warn("AI provider tool call failed, falling back to simple completion", e);
            error = e.getMessage();
            // Fallback: simple completion without tools
            AiProvider.Result simpleResult = null;
            try {
                simpleResult = provider.complete(systemPrompt, userMessage);
            } catch (Exception e2) {
                error = e2.getMessage();
                simpleResult = new AiProvider.Result(
                    "I'm having trouble right now. Please try again.", null, null);
            }
            result = new AiProvider.ToolCallResult(
                simpleResult.text(), List.of(),
                simpleResult.promptTokens(), simpleResult.completionTokens());
        }

        int duration = (int) (System.currentTimeMillis() - t0);

        // Log invocation
        invocations.save(AiInvocation.builder()
            .kind("ASSISTANT_CHAT")
            .provider(provider.name()).model(provider.model())
            .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
            .inputSummary(userMessage.substring(0, Math.min(200, userMessage.length())))
            .output(result.text() + (result.toolCalls().isEmpty() ? "" : " [tool calls: " + result.toolCalls().size() + "]"))
            .error(error)
            .userId(userId).tenantId(tenantId)
            .durationMs(duration).build());

        // Stream text content first
        if (result.text() != null && !result.text().isBlank()) {
            emitter.send(SseEmitter.event().name("token")
                .data(Map.of("token", result.text())));
        }

        // Process tool calls from native function calling
        if (!result.toolCalls().isEmpty()) {
            for (var tc : result.toolCalls()) {
                emitter.send(SseEmitter.event().name("tool_start")
                    .data(Map.of("toolName", tc.name())));

                AssistantToolCatalog.ToolDef tool = tools.stream()
                    .filter(t -> t.name().equals(tc.name())).findFirst().orElse(null);

                Map<String, Object> parsedArgs;
                try {
                    parsedArgs = om.readValue(tc.arguments(), Map.class);
                } catch (Exception e) {
                    parsedArgs = Map.of();
                }

                if (tool != null && tool.write()) {
                    if (isSuperAdmin) {
                        try {
                            ToolResult toolResult = toolExecutor.execute(tc.name(), parsedArgs, userId);
                            emitter.send(SseEmitter.event().name("tool_result")
                                .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                             "data", toolResult.data())));
                        } catch (Exception e) {
                            emitter.send(SseEmitter.event().name("error")
                                .data(Map.of("message", e.getMessage(), "code", "TOOL_ERROR")));
                        }
                    } else {
                        String summary = "Execute " + tc.name();
                        var draft = toolExecutor.createDraft(tc.name(), parsedArgs,
                            summary, userId, tenantId);
                        emitter.send(SseEmitter.event().name("draft").data(Map.of(
                            "draftId", draft.getId().toString(),
                            "toolName", draft.getToolName(),
                            "summary", draft.getSummary(),
                            "toolInput", parsedArgs)));
                    }
                } else if (tool != null) {
                    try {
                        ToolResult toolResult = toolExecutor.execute(tc.name(), parsedArgs, userId);
                        emitter.send(SseEmitter.event().name("tool_result")
                            .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                         "data", toolResult.data())));
                    } catch (Exception e) {
                        emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", e.getMessage(), "code", "TOOL_ERROR")));
                    }
                } else {
                    // Tool not found in scoped catalog — tell user what's available
                    List<String> available = tools.stream()
                        .map(AssistantToolCatalog.ToolDef::name)
                        .toList();
                    emitter.send(SseEmitter.event().name("error")
                        .data(Map.of(
                            "message", "I don't have access to '" + tc.name() + "'. " +
                                "Available tools: " + String.join(", ", available),
                            "code", "UNKNOWN_TOOL")));
                }
            }
        }

        emitter.send(SseEmitter.event().name("done").data("{}"));
    }

    /** Convert our ToolDef to OpenAI function-calling format. */
    private Map<String, Object> toOpenAiTool(AssistantToolCatalog.ToolDef tool) {
        Map<String, Object> fn = new java.util.LinkedHashMap<>();
        fn.put("name", tool.name());
        fn.put("description", tool.description());
        fn.put("parameters", tool.parameters());
        return Map.of("type", "function", "function", fn);
    }

    public DraftResponse confirmDraft(UUID draftId, UUID userId) {
        ToolResult result = toolExecutor.executeDraft(draftId, userId);
        return new DraftResponse(draftId, "completed", "Action completed", Map.of());
    }

    public void rejectDraft(UUID draftId) {
        toolExecutor.rejectDraft(draftId);
    }

}
