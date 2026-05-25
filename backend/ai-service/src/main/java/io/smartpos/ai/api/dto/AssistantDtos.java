package io.smartpos.ai.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AssistantDtos {

    private AssistantDtos() {}

    public record ChatRequest(
        String message,
        String language,
        /**
         * Optional UI context — the page/entity the user is currently
         * looking at. The frontend should populate this so the assistant
         * understands "email this" without guessing. Example:
         *   { "page": "sale-detail", "entityType": "sale",
         *     "entityId": "uuid", "entityRef": "INV-2026-000002" }
         */
        Map<String, Object> pageContext
    ) {
        public ChatRequest(String message, String language) {
            this(message, language, null);
        }
    }

    public record DraftResponse(
        UUID draftId,
        String toolName,
        String summary,
        Map<String, Object> toolInput
    ) {}

    public sealed interface StreamEvent {
        record MetaEvent(UUID conversationId) implements StreamEvent {}
        record TokenEvent(String token) implements StreamEvent {}
        record ToolStartEvent(String toolName) implements StreamEvent {}
        record ToolResultEvent(ToolResult result) implements StreamEvent {}
        record DraftEvent(DraftResponse draft) implements StreamEvent {}
        record ErrorEvent(String message, String code) implements StreamEvent {}
        record DoneEvent() implements StreamEvent {}
    }

    public record ToolResult(
        String type,
        String title,
        Map<String, Object> data
    ) {}

    /**
     * Structured tool-execution failure. Carries a machine-recognisable code,
     * the human message, and a remediation hint the LLM can read back to the
     * user instead of a bare stack-trace string.
     */
    public record ToolError(
        String tool,
        String code,        // e.g. NO_WAREHOUSE, FORBIDDEN, NOT_FOUND, UPSTREAM, INVALID_ARG
        String message,     // short, user-safe message
        String hint         // remediation hint or next-best-action
    ) {}
}
