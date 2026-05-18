package io.smartpos.ai.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AssistantDtos {

    private AssistantDtos() {}

    public record ChatRequest(
        String message,
        String language
    ) {}

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
}
