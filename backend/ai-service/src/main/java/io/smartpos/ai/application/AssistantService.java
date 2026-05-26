package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.api.dto.AssistantDtos.ConfirmResponse;
import io.smartpos.ai.api.dto.AssistantDtos.ToolResult;
import io.smartpos.ai.api.dto.IntentClassification;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.context.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

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
    private final Executor assistantTaskExecutor;
    private final ObjectMapper om = new ObjectMapper();

    @Value("${smartpos.ai.default-timezone:Africa/Dar_es_Salaam}")
    private String defaultTimezone;

    @Value("${smartpos.ai.proactive-briefing-enabled:true}")
    private boolean proactiveBriefingEnabled;

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
                            TenantMemoryStore tenantMemory,
                            @Qualifier("assistantTaskExecutor") Executor assistantTaskExecutor) {
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
        this.assistantTaskExecutor = assistantTaskExecutor;
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

        // Remember user context to personalise future interactions
        if (intent.onboarding()) {
            tenantMemory.remember(tenantId, "experience_level", "new");
        }
        if (isIdentityQuestion(request.message())) {
            tenantMemory.remember(tenantId, "user_asked_identity", "true");
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
        ZoneId tenantZone = resolveZone(jwt);
        LocalDate tenantToday = ZonedDateTime.now(tenantZone).toLocalDate();
        LocalDate briefingDate = tenantToday.minusDays(1);

        if (proactiveBriefingEnabled && conversationIdParam == null
            && (profile == RoleProfile.OWNER || profile == RoleProfile.MANAGER)) {
            try {
                var briefing = toolExecutor.execute("getExecutiveBriefing",
                    Map.of("date", briefingDate.toString()), userId);
                String alert = greetingFor(ZonedDateTime.now(tenantZone)) + ". Here's your briefing for " +
                    briefingDate + ":\n\n" +
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

        Runnable assistantTask = () -> {
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
        };

        try {
            assistantTaskExecutor.execute(assistantTask);
        } catch (RejectedExecutionException e) {
            try {
                emitter.send(SseEmitter.event().name("error").data(Map.of(
                    "message", "Assistant is busy. Please try again in a moment.",
                    "code", "BUSY")));
                emitter.complete();
            } catch (IOException ignored) {}
        }

        return emitter;
    }

    private ZoneId resolveZone(Jwt jwt) {
        for (String claim : List.of("timezone", "timeZone", "zoneId", "tenantTimezone")) {
            String value = jwt.getClaimAsString(claim);
            if (value != null && !value.isBlank()) {
                try { return ZoneId.of(value); } catch (Exception ignored) {}
            }
        }
        try { return ZoneId.of(defaultTimezone); } catch (Exception ignored) {
            return ZoneId.of("UTC");
        }
    }

    private boolean isIdentityQuestion(String message) {
        if (message == null) return false;
        String lower = message.toLowerCase();
        return lower.matches(".*\\b(who are you|what are you|what (ai|model|llm)|who (made|built|created) you|who (is|are) your|what (is|are) your)\\b.*")
            || lower.matches(".*\\b(you are (who|what|which)|your name|je (wewe )?(ni )?(nani|nini)|umetengenezwa|umetengenezwaje|unaendeshwa|ni akili gani)\\b.*");
    }

    private String greetingFor(ZonedDateTime now) {
        int hour = now.getHour();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
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

        // Force tool use for data domains — prevents the LLM from answering
        // from memory when real business data is available.
        boolean forceTools = !openAiTools.isEmpty() && isDataDomain(routeIntent);

        AiProvider.ToolCallResult result;
        String error = null;
        try {
            result = provider.completeWithToolsStreaming(systemPrompt, messages,
                openAiTools.isEmpty() ? null : openAiTools,
                forceTools,
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
                    emitter.send(SseEmitter.event().name("verification")
                        .data(Map.of(
                            "grounded", false,
                            "score", verdict.groundingScore(),
                            "unverified", verdict.unverifiedNumbers())));

                    // Block hallucinated answers when grounding is poor.
                    // If more than half the numbers are unverified, or the tool
                    // results show zero/count while the answer claims non-zero,
                    // rebuild a grounded response from the actual tool data.
                    double score = verdict.groundingScore();
                    boolean toolShowsZero = haystackShowsZero(collectedToolResults);
                    if (score < 0.5 || toolShowsZero) {
                        String corrected = buildGroundedFallback(
                                collectedToolResults, toolErrors, currentUserMessage);
                        emitter.send(SseEmitter.event().name("token")
                                .data(Map.of("token", corrected)));
                        messages.add(Map.of("role", "assistant", "content", corrected));
                        return;
                    }
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
            String contradictionNote = detectDataContradiction(toolResults);
            String synthesisPrompt = """
                User question:
                %s

                Tool outputs as JSON:
                %s
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
                """.formatted(userMessage, toolJson, contradictionNote);
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
     * Scans tool results for contradictory data patterns (e.g. count=0 but
     * grossRevenue>0) and returns a hard injection note for the synthesis
     * prompt. When a contradiction is detected, it FORCES the LLM to call
     * out the inconsistency explicitly rather than parroting both figures.
     */
    private String detectDataContradiction(List<ToolResult> toolResults) {
        if (toolResults == null || toolResults.isEmpty()) return "";

        for (ToolResult tr : toolResults) {
            Map<String, Object> data = tr.data();
            if (data == null) continue;

            // Check for zero-count + non-zero-revenue pattern
            double revenue = extractFirstNumeric(data,
                "grossRevenue", "totalAmount", "revenue", "gross", "totalRevenue", "totalSales");
            double count = extractFirstNumeric(data,
                "count", "totalCount", "rowCount", "transactionCount", "totalTransactions", "orders");

            if (count == 0 && revenue > 0) {
                return """
                    ⚠️ DATA INCONSISTENCY — READ THIS BEFORE ANSWERING:
                    The tool results contain a contradiction: the count/transaction
                    count is ZERO but the revenue/monetary total is NON-ZERO
                    (%.0f). This is likely caused by:
                    1. The date range spans a period with data but the status filter
                       (e.g. "confirmed" only) excludes those records.
                    2. Sales exist in draft or pending status that contribute to
                       the total but are not counted.
                    3. A data synchronization or aggregation issue.

                    YOUR ANSWER MUST:
                    - Call out the inconsistency explicitly: "Your data shows
                      %.0f in revenue but zero recorded transactions — this
                      suggests..."
                    - Suggest the user verify the date range and status filter.
                    - Recommend they check with an admin if it persists.
                    - DO NOT present the zero count and the amount as if they are
                      both normal — they are NOT.
                    """.formatted(revenue, revenue);
            }
        }
        return "";
    }

    /** Returns the first non-zero numeric value from a map given a list of candidate keys. */
    private double extractFirstNumeric(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object val = data.get(key);
            if (val instanceof Number n && n.doubleValue() != 0) return n.doubleValue();
        }
        return 0;
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

    public ConfirmResponse confirmDraft(UUID draftId, UUID userId) {
        ToolResult result = toolExecutor.executeDraft(draftId, userId);
        return new ConfirmResponse(draftId, "completed", "Action completed", result);
    }

    public void rejectDraft(UUID draftId) {
        toolExecutor.rejectDraft(draftId);
    }

    /** Data domains where the LLM MUST use tools to answer accurately. */
    private static boolean isDataDomain(IntentClassification intent) {
        if (intent == null) return false;
        return switch (intent.primaryDomain()) {
            case SALES, INVENTORY, PRODUCTS, CUSTOMERS, FINANCE, HRM -> true;
            case HELP, PLATFORM_ADMIN, GENERAL -> false;
        };
    }

    /** Check whether ALL tool results show zero count/amount. */
    private static boolean haystackShowsZero(List<AssistantDtos.ToolResult> results) {
        if (results == null || results.isEmpty()) return true;
        boolean foundNonZero = false;
        for (var r : results) {
            Map<String, Object> data = r.data();
            if (data != null) {
                for (Object v : data.values()) {
                    if (v instanceof Number n && n.doubleValue() > 0) { foundNonZero = true; break; }
                }
            }
            if (foundNonZero) break;
        }
        return !foundNonZero;
    }

    /**
     * Build a grounded fallback answer from the actual tool results when the LLM
     * hallucinates numbers that don't appear in the data. Never invents figures.
     */
    private static String buildGroundedFallback(
            List<AssistantDtos.ToolResult> results,
            List<AssistantDtos.ToolError> toolErrors,
            String userMessage) {
        if (toolErrors != null && !toolErrors.isEmpty()) {
            return "Samahani, sikuweza kupata data sahihi kwa sasa. "
                    + toolErrors.get(0).message();
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Kulingana na rekodi zilizopo:\n\n");
        if (results == null || results.isEmpty()) {
            sb.append("Hakuna data iliyopatikana kwa kipindi ulichochagua.");
            return sb.toString();
        }
        for (var r : results) {
            Map<String, Object> data = r.data();
            if (data != null) {
                for (var entry : data.entrySet()) {
                    sb.append("- **").append(entry.getKey()).append("**: ")
                            .append(entry.getValue()).append("\n");
                }
            }
        }
        sb.append("\n_⁠(Hesabu zote zimetolewa moja kwa moja kutoka kwenye rekodi.)_⁠");
        return sb.toString();
    }

}
