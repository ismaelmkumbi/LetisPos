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
import java.util.LinkedHashMap;
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
    private final ToolResultCache toolResultCache;
    private final MassSendGuard massSendGuard;
    private final TenantMemoryStore tenantMemory;
    private final ObjectMapper om = new ObjectMapper();

    public AssistantService(AiRouter aiRouter, AssistantPromptBuilder promptBuilder,
                            AssistantToolCatalog toolCatalog,
                            AssistantToolExecutor toolExecutor,
                            AiInvocationRepository invocations,
                            ConversationStore conversationStore,
                            ConversationSummarizer summarizer,
                            IntentClassifierService classifier,
                            KnowledgeBase knowledgeBase,
                            ToolResultCache toolResultCache,
                            MassSendGuard massSendGuard,
                            TenantMemoryStore tenantMemory) {
        this.aiRouter = aiRouter;
        this.promptBuilder = promptBuilder;
        this.toolCatalog = toolCatalog;
        this.toolExecutor = toolExecutor;
        this.invocations = invocations;
        this.conversationStore = conversationStore;
        this.summarizer = summarizer;
        this.classifier = classifier;
        this.knowledgeBase = knowledgeBase;
        this.toolResultCache = toolResultCache;
        this.massSendGuard = massSendGuard;
        this.tenantMemory = tenantMemory;
    }

    public SseEmitter chat(AssistantDtos.ChatRequest request, Jwt jwt,
                           UUID userId, UUID conversationIdParam) {
        UUID tenantId = TenantContext.require();
        @SuppressWarnings("unchecked")
        var roles = (List<String>) jwt.getClaims().get("roles");
        RoleProfile resolvedProfile = RoleProfile.fromJwt(roles);
        boolean isSuperAdmin = resolvedProfile.isPlatformLevel();

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
        RoleProfile profile = resolvedProfile;
        int effectiveMaxRounds = profile.maxToolRounds();

        // 3. Determine language (intent can override client preference)
        String effectiveLanguage = intent.language() == IntentClassification.Language.SWAHILI
            ? "sw" : request.language();
        // Remember language preference so the next conversation starts in
        // the right tongue without the user having to switch the UI.
        if ("sw".equalsIgnoreCase(effectiveLanguage)) {
            tenantMemory.remember(tenantId, "preferred_language", "sw");
        } else if ("en".equalsIgnoreCase(effectiveLanguage)) {
            tenantMemory.remember(tenantId, "preferred_language", "en");
        }

        // 4. Handle conversation: create new or load existing
        UUID convId = conversationIdParam != null ? conversationIdParam : UUID.randomUUID();
        List<Map<String, Object>> history = conversationStore.loadMessages(tenantId, convId);

        // Extract summary from history (look for the system message with "Previous conversation summary:")
        String summary = conversationStore.loadSummary(tenantId, convId);
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

        // 5. Build frozen system prompt (cacheable) + dynamic context
        String systemPrompt = promptBuilder.buildFrozen(jwt, effectiveLanguage);
        String dynamicCtx = promptBuilder.buildDynamicContext(jwt, effectiveLanguage,
            intent, summary, request.pageContext(), tenantId);

        // Inject dynamic context into the user message so the system prompt
        // stays cacheable across requests from the same tenant/role.
        String enrichedUserMessage = "[Context: " + dynamicCtx + "]\n\n"
            + (knowledgeChunks.isEmpty() ? "" : "Knowledge:\n" + String.join("\n", knowledgeChunks) + "\n\n")
            + request.message();

        // Add enriched user message (with dynamic context) to history
        cleanHistory.add(Map.of("role", "user", "content", enrichedUserMessage));

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
                // Also prepend to conversation history so follow-up questions have context
                cleanHistory.add(cleanHistory.size() - 1,
                    Map.of("role", "assistant", "content", alert));
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
                    userId, tenantId, convId, 0, isSuperAdmin, effectiveMaxRounds, profile,
                    enrichedUserMessage, request.message());
                emitter.complete();
            } catch (Exception e) {
                log.error("Assistant chat error", e);
                try {
                    emitter.send(SseEmitter.event()
                        .name("error")
                        .data(Map.of("message", e.getMessage() != null ? e.getMessage() : "Internal error", "code", "INTERNAL")));
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
                                      RoleProfile profile,
                                      String enrichedUserMessage,
                                      String rawUserMessage) throws IOException {
        if (round >= maxRounds) {
            emitter.send(SseEmitter.event().name("done").data("{}"));
            return;
        }

        // Tier-route based on the raw user intent (cheap local classification).
        IntentClassification routeIntent = classifier.classify(rawUserMessage);
        AiProvider provider = aiRouter.forIntent(routeIntent);
        long t0 = System.currentTimeMillis();

        // Build OpenAI function-calling tool definitions
        List<Map<String, Object>> openAiTools = tools.stream()
            .map(this::toOpenAiTool)
            .toList();

        AiProvider.ToolCallResult result;
        String error = null;
        try {
            result = provider.completeWithToolsStreaming(systemPrompt, messages,
                openAiTools.isEmpty() ? null : openAiTools,
                token -> {
                    try {
                        emitter.send(SseEmitter.event().name("token")
                            .data(Map.of("token", token)));
                    } catch (IOException ignored) {}
                });
        } catch (Exception e) {
            log.warn("AI provider tool call failed, falling back to simple completion", e);
            error = e.getMessage();
            String fallbackUserMessage = messages.stream()
                .filter(m -> "user".equals(m.get("role")))
                .map(m -> String.valueOf(m.getOrDefault("content", "")))
                .reduce((first, second) -> second)
                .orElse("");
            AiProvider.Result simpleResult = null;
            try {
                simpleResult = provider.complete(systemPrompt, fallbackUserMessage);
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

        // Log invocation (PII-redacted)
        String redactedInput = PiiRedactor.redact(
            currentUserMessage.substring(0, Math.min(200, currentUserMessage.length())));
        String redactedOutput = PiiRedactor.redact(result.text())
            + (result.toolCalls().isEmpty() ? "" : " [tool calls: " + result.toolCalls().size() + "]");
        invocations.save(AiInvocation.builder()
            .kind("ASSISTANT_CHAT")
            .provider(provider.name()).model(provider.model())
            .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
            .inputSummary(redactedInput)
            .output(redactedOutput)
            .error(error)
            .userId(userId).tenantId(tenantId)
            .durationMs(duration).build());

        // Text already streamed via completeWithToolsStreaming callback.
        // Process tool calls from native function calling
        List<ToolResult> collectedToolResults = new java.util.ArrayList<>();
        List<AssistantDtos.ToolError> toolErrors = new java.util.ArrayList<>();
        Map<String, ToolResult> toolResultsByCallId = new LinkedHashMap<>();
        Map<String, AssistantDtos.ToolError> toolErrorsByCallId = new LinkedHashMap<>();
        boolean hasWriteDrafts = false;
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
                    // Mass-send / rate-limit guard applies whether or not the
                    // caller is super-admin — auto-execution path included.
                    ToolException guardErr = massSendGuard.check(tc.name(), parsedArgs, tenantId, isSuperAdmin);
                    if (guardErr != null) {
                        AssistantDtos.ToolError err = new AssistantDtos.ToolError(
                            tc.name(), guardErr.code(), guardErr.getMessage(), guardErr.hint());
                        toolErrors.add(err);
                        toolErrorsByCallId.put(tc.id(), err);
                        emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", err.message(), "code", err.code(), "hint", err.hint())));
                        continue;
                    }
                    if (isSuperAdmin) {
                        try {
                            ToolResult toolResult = toolExecutor.execute(tc.name(), parsedArgs, userId);
                            // Write actions invalidate the read cache for this tenant
                            toolResultCache.invalidateTenant(tenantId);
                            collectedToolResults.add(toolResult);
                            toolResultsByCallId.put(tc.id(), toolResult);
                            emitter.send(SseEmitter.event().name("tool_result")
                                .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                             "data", toolResult.data())));
                        } catch (Exception e) {
                            AssistantDtos.ToolError err = toStructuredError(tc.name(), e);
                            toolErrors.add(err);
                            toolErrorsByCallId.put(tc.id(), err);
                            emitter.send(SseEmitter.event().name("error")
                                .data(Map.of("message", err.message(), "code", err.code(), "hint", err.hint())));
                        }
                    } else {
                        hasWriteDrafts = true;
                        toolErrorsByCallId.put(tc.id(), new AssistantDtos.ToolError(
                            tc.name(), "DRAFT_PENDING",
                            "Draft created; waiting for user confirmation.",
                            "Confirm or reject the draft to continue."));
                        String draftSummary = DraftSummarizer.summarize(tc.name(), parsedArgs);
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
                        ToolResult cached = toolResultCache.get(tenantId, tc.name(), parsedArgs);
                        ToolResult toolResult = cached != null
                            ? cached
                            : toolExecutor.execute(tc.name(), parsedArgs, userId);
                        if (cached == null) {
                            toolResultCache.put(tenantId, tc.name(), parsedArgs, toolResult);
                        }
                        collectedToolResults.add(toolResult);
                        toolResultsByCallId.put(tc.id(), toolResult);
                        emitter.send(SseEmitter.event().name("tool_result")
                            .data(Map.of("type", toolResult.type(), "title", toolResult.title(),
                                         "data", toolResult.data())));
                    } catch (Exception e) {
                        AssistantDtos.ToolError err = toStructuredError(tc.name(), e);
                        toolErrors.add(err);
                        toolErrorsByCallId.put(tc.id(), err);
                        emitter.send(SseEmitter.event().name("error")
                            .data(Map.of("message", err.message(), "code", err.code(), "hint", err.hint())));
                    }
                } else {
                    List<String> available = tools.stream()
                        .map(AssistantToolCatalog.ToolDef::name)
                        .toList();
                    AssistantDtos.ToolError err = new AssistantDtos.ToolError(
                        tc.name(), "UNKNOWN_TOOL",
                        "I don't have access to '" + tc.name() + "'.",
                        "Try one of: " + String.join(", ", available.subList(0, Math.min(8, available.size()))) + "…");
                    toolErrors.add(err);
                    toolErrorsByCallId.put(tc.id(), err);
                    emitter.send(SseEmitter.event().name("error")
                        .data(Map.of("message", err.message(), "code", err.code(), "hint", err.hint())));
                }
            }

            // Append assistant message with tool_calls to the working messages list
            Map<String, Object> assistantMsg = new java.util.LinkedHashMap<>();
            assistantMsg.put("role", "assistant");
            assistantMsg.put("content", result.text() != null ? result.text() : "");
            List<Map<String, Object>> tcForHistory = new ArrayList<>();
            for (var tc : result.toolCalls()) {
                Map<String, Object> tcMap = new java.util.LinkedHashMap<>();
                tcMap.put("id", tc.id());
                tcMap.put("type", "function");
                tcMap.put("function", Map.of("name", tc.name(), "arguments", tc.arguments()));
                tcForHistory.add(tcMap);
            }
            if (!tcForHistory.isEmpty()) {
                assistantMsg.put("tool_calls", tcForHistory);
            }
            messages.add(assistantMsg);

            // Append tool result messages
            for (int i = 0; i < result.toolCalls().size(); i++) {
                var tc = result.toolCalls().get(i);
                Map<String, Object> toolMsg = new java.util.LinkedHashMap<>();
                toolMsg.put("role", "tool");
                toolMsg.put("tool_call_id", tc.id());
                ToolResult matchedResult = toolResultsByCallId.get(tc.id());
                AssistantDtos.ToolError matchedError = toolErrorsByCallId.get(tc.id());
                if (matchedResult != null) {
                    try {
                        toolMsg.put("content", om.writeValueAsString(matchedResult));
                    } catch (Exception e) {
                        toolMsg.put("content", "{}");
                    }
                } else if (matchedError != null) {
                    toolMsg.put("content", om.writeValueAsString(Map.of(
                        "error", true,
                        "code", matchedError.code(),
                        "message", matchedError.message(),
                        "hint", matchedError.hint())));
                } else {
                    toolMsg.put("content", "{}");
                }
                messages.add(toolMsg);
            }

            // Multi-turn loop: if there are more rounds available, let the LLM
            // continue with the tool results. This enables chained actions like
            // searchDocuments → emailDocument within a single user message.
            if (!hasWriteDrafts && round + 1 < maxRounds) {
                processConversation(emitter, systemPrompt, messages, tools,
                    userId, tenantId, conversationId, round + 1,
                    isSuperAdmin, maxRounds, profile, enrichedUserMessage, rawUserMessage);
                return; // the recursive call handles saving and done
            }

            // Synthesize final answer from collected tool results
            String synthesis = synthesizeToolAnswer(provider, systemPrompt, currentUserMessage,
                collectedToolResults, toolErrors);
            if (synthesis != null && !synthesis.isBlank()) {
                AnswerVerifier.Verdict verdict =
                    AnswerVerifier.verify(synthesis, collectedToolResults);
                if (!verdict.grounded()) {
                    log.warn("Assistant answer drift: {} unverified numbers ({}/{}): {}",
                        verdict.unverifiedNumbers().size(),
                        verdict.unverifiedNumbers().size(), verdict.totalNumbers(),
                        verdict.unverifiedNumbers());
                    // Emit telemetry; don't block the stream — production-friendly soft fail.
                    emitter.send(SseEmitter.event().name("verification")
                        .data(Map.of(
                            "grounded", false,
                            "score", verdict.groundingScore(),
                            "unverified", verdict.unverifiedNumbers())));
                }
                emitter.send(SseEmitter.event().name("token")
                    .data(Map.of("token", synthesis)));
                messages.add(Map.of("role", "assistant", "content", synthesis));
            }
        } else {
            messages.add(Map.of("role", "assistant",
                "content", result.text() != null ? result.text() : ""));
        }

        // Save conversation history
        List<ConversationStore.Message> savedMessages = new ArrayList<>();
        for (Map<String, Object> msg : messages) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tcList = (List<Map<String, Object>>) msg.get("tool_calls");
            String content = String.valueOf(msg.getOrDefault("content", ""));
            if ("user".equals(msg.get("role")) && content.equals(enrichedUserMessage)) {
                content = rawUserMessage;
            }
            savedMessages.add(new ConversationStore.Message(
                String.valueOf(msg.get("role")),
                content,
                tcList,
                msg.get("tool_call_id") == null ? null : String.valueOf(msg.get("tool_call_id")),
                null));
        }
        String existingSummary = conversationStore.loadSummary(tenantId, conversationId);
        String nextSummary = existingSummary;
        if (savedMessages.size() > 20) {
            List<ConversationStore.Message> older = savedMessages.subList(0, savedMessages.size() - 20);
            nextSummary = mergeSummaries(existingSummary, summarizer.summarize(older));
        }
        conversationStore.save(tenantId, conversationId, savedMessages, nextSummary);

        emitter.send(SseEmitter.event().name("done").data("{}"));
    }

    private String mergeSummaries(String existingSummary, String newSummary) {
        if (newSummary == null || newSummary.isBlank()) return existingSummary;
        if (existingSummary == null || existingSummary.isBlank()) return newSummary;
        return summarizer.summarize(List.of(
            new ConversationStore.Message("system", existingSummary, null, null, null),
            new ConversationStore.Message("system", newSummary, null, null, null)
        ));
    }

    private String synthesizeToolAnswer(AiProvider provider, String systemPrompt, String userMessage,
                                        List<ToolResult> toolResults, List<AssistantDtos.ToolError> toolErrors) {
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

                Write the final answer for the merchant. Hard rules:
                - GROUNDING: every number, name, date, or status you state MUST
                  appear verbatim in the toolResults JSON above. Do NOT invent
                  or interpolate. If a figure is missing, say so explicitly.
                - REFUSAL: if toolResults is empty and toolErrors is empty, or
                  if rows is an empty array, say "I don't have data for that"
                  and suggest the closest available query — do NOT guess.
                - VERIFY: before stating any percentage or comparison, re-check
                  it can be computed from the JSON. Otherwise omit it.
                - COHERENCE: never report contradictory totals. If `count` is 0
                  but `gross` is non-zero (or vice versa), call it out as a
                  data inconsistency rather than parroting both. Suggest the
                  user verify the date range or the status filter.
                - RISK FIRST: if any tool result contains a `risk` block with
                  outOfStockItems or lowStockItems, LEAD with it. Name the
                  out-of-stock products explicitly and quote `lockedRevenue`.
                  This applies to OWNER/MANAGER/TENANT_ADMIN roles especially.
                - DO NOT REPEAT THE TABLE as a markdown pipe table — it's
                  already rendered above your answer. Summarise it in prose
                  instead, calling out the 1-3 most important rows.
                - Mention the period used when dates are present, and clarify
                  whether it's CALENDAR (e.g. "April 1–April 30") or ROLLING
                  ("last 30 days from today").
                - Give one practical next action.
                - VARY YOUR CLOSE. Do not end with "let me know if you need
                  help" every turn. Better: skip the close, or ask one
                  pointed follow-up.
                - If toolErrors is non-empty, do NOT apologise generically. Read the
                  error's "hint" field and rephrase it as concrete next-step guidance
                  for the user. Mention the failing module so they know where to act.
                - For NO_WAREHOUSE: tell the user to set up at least one warehouse in
                  Settings → Warehouses before stock queries will work.
                - For FORBIDDEN: explain the action needs a higher role.
                - For NOT_FOUND: ask for a clearer name/ID.
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

    /**
     * Convert a tool exception into a structured ToolError the LLM can read.
     * Preserves explicit ToolException codes/hints; otherwise classifies the
     * raw exception message into a known code.
     */
    private AssistantDtos.ToolError toStructuredError(String toolName, Exception e) {
        if (e instanceof ToolException te) {
            return new AssistantDtos.ToolError(toolName, te.code(),
                te.getMessage() != null ? te.getMessage() : "Tool failed", te.hint());
        }
        ToolException classified = ToolException.classify(toolName, e);
        return new AssistantDtos.ToolError(toolName, classified.code(),
            classified.getMessage(), classified.hint());
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
