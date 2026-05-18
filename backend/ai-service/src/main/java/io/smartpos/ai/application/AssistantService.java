package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.api.dto.AssistantDtos.DraftResponse;
import io.smartpos.ai.api.dto.AssistantDtos.ToolResult;
import io.smartpos.ai.api.dto.IntentClassification;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);

    private final AiRouter aiRouter;
    private final AssistantPromptBuilder promptBuilder;
    private final AssistantToolCatalog toolCatalog;
    private final AssistantToolExecutor toolExecutor;
    private final AiInvocationRepository invocations;
    private final ConversationStore conversationStore;
    private final ConversationSummarizer summarizer;
    private final IntentClassifierService classifier;
    private final KnowledgeBase knowledgeBase;
    private final ObjectMapper om = new ObjectMapper();

    public AssistantService(AiRouter aiRouter, AssistantPromptBuilder promptBuilder,
                            AssistantToolCatalog toolCatalog,
                            AssistantToolExecutor toolExecutor,
                            AiInvocationRepository invocations,
                            ConversationStore conversationStore,
                            ConversationSummarizer summarizer,
                            IntentClassifierService classifier,
                            KnowledgeBase knowledgeBase) {
        this.aiRouter = aiRouter;
        this.promptBuilder = promptBuilder;
        this.toolCatalog = toolCatalog;
        this.toolExecutor = toolExecutor;
        this.invocations = invocations;
        this.conversationStore = conversationStore;
        this.summarizer = summarizer;
        this.classifier = classifier;
        this.knowledgeBase = knowledgeBase;
    }

    public SseEmitter chat(AssistantDtos.ChatRequest request, Jwt jwt,
                           UUID userId, UUID conversationIdParam) {
        UUID tenantId = TenantContext.require();
        @SuppressWarnings("unchecked")
        var roles = (List<String>) jwt.getClaims().get("roles");
        boolean isSuperAdmin = roles != null && roles.contains("SUPER_ADMIN");

        // 1. Classify intent
        IntentClassification intent = classifier.classify(request.message());

        // Search knowledge base when user is asking a HELP question or confidence is low
        final List<String> knowledgeChunks;
        if (intent.primaryDomain() == IntentClassification.Domain.HELP || intent.confidence() < 0.6) {
            knowledgeChunks = knowledgeBase.search(request.message(), intent.primaryDomain().name());
        } else {
            knowledgeChunks = List.of();
        }

        // 2. Determine role profile
        RoleProfile profile = RoleProfile.fromJwt(roles);
        int effectiveMaxRounds = profile.maxToolRounds();

        // 3. Determine language (intent can override client preference)
        String effectiveLanguage = intent.language() == IntentClassification.Language.SWAHILI
            ? "sw" : request.language();

        // 4. Handle conversation: create new or load existing
        UUID convId = conversationIdParam != null ? conversationIdParam : UUID.randomUUID();
        List<Map<String, Object>> history = conversationStore.loadMessages(tenantId, convId);

        // Extract summary from history (look for the system message with "Previous conversation summary:")
        String summary = null;
        for (Map<String, Object> msg : history) {
            if ("system".equals(msg.get("role"))
                && String.valueOf(msg.get("content")).startsWith("Previous conversation summary")) {
                summary = String.valueOf(msg.get("content"))
                    .replace("Previous conversation summary: ", "");
                break;
            }
        }

        // Remove summary system messages from history (they were synthetic)
        List<Map<String, Object>> cleanHistory = new ArrayList<>();
        for (Map<String, Object> msg : history) {
            if (!("system".equals(msg.get("role"))
                && String.valueOf(msg.get("content")).startsWith("Previous conversation summary"))) {
                cleanHistory.add(msg);
            }
        }

        // Add current user message to history
        cleanHistory.add(Map.of("role", "user", "content", request.message()));

        // 5. Build enhanced prompt
        String basePrompt = promptBuilder.build(jwt, effectiveLanguage, intent, summary, profile);
        final String systemPrompt;
        if (!knowledgeChunks.isEmpty()) {
            StringBuilder sb = new StringBuilder(basePrompt);
            sb.append("\nUse the following knowledge to answer:\n");
            for (int i = 0; i < knowledgeChunks.size(); i++) {
                sb.append("[").append(i + 1).append("] ").append(knowledgeChunks.get(i)).append("\n");
            }
            systemPrompt = sb.toString();
        } else {
            systemPrompt = basePrompt;
        }

        // 6. Narrowed tools using intent
        List<AssistantToolCatalog.ToolDef> tools = toolCatalog.scopedTools(jwt, request.message());

        // Capture auth for background thread
        String jwtToken = jwt.getTokenValue();
        var securityCtx = org.springframework.security.core.context.SecurityContextHolder.getContext();

        SseEmitter emitter = new SseEmitter(120_000L); // 2 minute timeout

        // Emit conversationId meta event for new conversations
        if (conversationIdParam == null) {
            try {
                emitter.send(SseEmitter.event().name("meta")
                    .data(Map.of("conversationId", convId.toString())));
            } catch (IOException ignored) {}
        }

        // Proactive alert for owner/manager on new conversation
        if (conversationIdParam == null
            && (profile == RoleProfile.OWNER || profile == RoleProfile.MANAGER)) {
            try {
                var briefing = toolExecutor.execute("getExecutiveBriefing",
                    Map.of("date", LocalDate.now().minusDays(1).toString()), userId);
                String alert = "Good morning. Here's your briefing for " +
                    LocalDate.now().minusDays(1).toString() + ":\n\n" +
                    briefing.title() + "\n" +
                    briefing.data().get("headline") + "\n\n" +
                    briefing.data().get("recommendedAction");
                // Send as initial message in the stream
                emitter.send(SseEmitter.event().name("token")
                    .data(Map.of("token", alert)));
            } catch (Exception e) {
                // Silent — briefing is a bonus, not required
                log.debug("Proactive alert skipped: {}", e.getMessage());
            }
        }

        new Thread(() -> {
            try {
                // Propagate security context to background thread for Feign calls
                org.springframework.security.core.context.SecurityContextHolder.setContext(securityCtx);
                TenantContext.set(tenantId);
                processConversation(emitter, systemPrompt, cleanHistory, tools,
                    userId, tenantId, convId, 0, isSuperAdmin, effectiveMaxRounds, profile);
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
                org.springframework.security.core.context.SecurityContextHolder.clearContext();
            }
        }).start();

        return emitter;
    }

    private void processConversation(SseEmitter emitter, String systemPrompt,
                                      List<Map<String, Object>> messages,
                                      List<AssistantToolCatalog.ToolDef> tools,
                                      UUID userId, UUID tenantId,
                                      UUID conversationId, int round,
                                      boolean isSuperAdmin, int maxRounds,
                                      RoleProfile profile) throws IOException {
        if (round >= maxRounds) {
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
            result = provider.completeWithTools(systemPrompt, messages,
                openAiTools.isEmpty() ? null : openAiTools);
        } catch (Exception e) {
            log.warn("AI provider tool call failed, falling back to simple completion", e);
            error = e.getMessage();
            // Fallback: simple completion without tools
            AiProvider.Result simpleResult = null;
            try {
                simpleResult = provider.complete(systemPrompt, messages);
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

        // Extract current user message for logging and synthesis
        String currentUserMessage = messages.stream()
            .filter(m -> "user".equals(m.get("role")))
            .map(m -> String.valueOf(m.getOrDefault("content", "")))
            .reduce((first, second) -> second)
            .orElse("");

        // Log invocation
        invocations.save(AiInvocation.builder()
            .kind("ASSISTANT_CHAT")
            .provider(provider.name()).model(provider.model())
            .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
            .inputSummary(currentUserMessage.substring(0, Math.min(200, currentUserMessage.length())))
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
        List<ToolResult> collectedToolResults = new java.util.ArrayList<>();
        List<String> toolErrors = new java.util.ArrayList<>();
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
                            collectedToolResults.add(toolResult);
                            emitter.send(SseEmitter.event().name("tool_result")
                                .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                             "data", toolResult.data())));
                        } catch (Exception e) {
                            toolErrors.add(tc.name() + ": " + e.getMessage());
                            emitter.send(SseEmitter.event().name("error")
                                .data(Map.of("message", e.getMessage(), "code", "TOOL_ERROR")));
                        }
                    } else {
                        String draftSummary = "Execute " + tc.name();
                        var draft = toolExecutor.createDraft(tc.name(), parsedArgs,
                            draftSummary, userId, tenantId);
                        emitter.send(SseEmitter.event().name("draft").data(Map.of(
                            "draftId", draft.getId().toString(),
                            "toolName", draft.getToolName(),
                            "summary", draft.getSummary(),
                            "toolInput", parsedArgs)));
                    }
                } else if (tool != null) {
                    try {
                        ToolResult toolResult = toolExecutor.execute(tc.name(), parsedArgs, userId);
                        collectedToolResults.add(toolResult);
                        emitter.send(SseEmitter.event().name("tool_result")
                            .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                         "data", toolResult.data())));
                    } catch (Exception e) {
                        toolErrors.add(tc.name() + ": " + e.getMessage());
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
                    toolErrors.add("Unknown tool: " + tc.name());
                }
            }

            String synthesis = synthesizeToolAnswer(provider, systemPrompt, currentUserMessage,
                collectedToolResults, toolErrors);
            if (synthesis != null && !synthesis.isBlank()) {
                emitter.send(SseEmitter.event().name("token")
                    .data(Map.of("token", synthesis)));
            }
        }

        // Save conversation history
        List<ConversationStore.Message> savedMessages = new ArrayList<>();
        for (Map<String, Object> msg : messages) {
            savedMessages.add(new ConversationStore.Message(
                String.valueOf(msg.get("role")),
                String.valueOf(msg.getOrDefault("content", "")),
                null, null, null));
        }
        // Also save the assistant's response
        if (result.text() != null && !result.text().isBlank()) {
            savedMessages.add(new ConversationStore.Message(
                "assistant", result.text(), null, null, null));
        }
        // Also save tool calls
        for (var tc : result.toolCalls()) {
            savedMessages.add(new ConversationStore.Message(
                "assistant", "",
                List.of(Map.of("id", tc.id(), "name", tc.name(), "arguments", tc.arguments())),
                tc.id(), null));
        }
        conversationStore.save(tenantId, conversationId, savedMessages, null);

        // Trigger summarization if conversation is getting long
        if (savedMessages.size() > 20) {
            // Summarization deferred to a follow-up task
        }

        emitter.send(SseEmitter.event().name("done").data("{}"));
    }

    private String synthesizeToolAnswer(AiProvider provider, String systemPrompt, String userMessage,
                                        List<ToolResult> toolResults, List<String> toolErrors) {
        if (toolResults.isEmpty() && toolErrors.isEmpty()) {
            return "";
        }
        try {
            String toolJson = om.writeValueAsString(Map.of(
                "toolResults", toolResults,
                "toolErrors", toolErrors
            ));
            String synthesisPrompt = """
                User question:
                %s

                Tool outputs as JSON:
                %s

                Write the final answer for the merchant. Requirements:
                - Do not repeat the chart/table title unless useful.
                - Use exact figures from the tool outputs.
                - Mention the period used when dates are present.
                - Give one practical next action.
                - If a tool errored, be transparent and suggest the next best step.
                - Keep it under 120 words.
                """.formatted(userMessage, toolJson);
            return provider.complete(systemPrompt, synthesisPrompt).text();
        } catch (Exception e) {
            log.warn("Assistant synthesis failed", e);
            if (!toolResults.isEmpty()) {
                return "I found the live data and displayed it above. Review the chart or table for the exact figures, then act on the highest-risk or highest-value item first.";
            }
            return "";
        }
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
