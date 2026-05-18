package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.application.AssistantService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/assistant")
public class AssistantController {

    private final AssistantService assistantService;

    public AssistantController(AssistantService assistantService) {
        this.assistantService = assistantService;
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter chat(@Valid @RequestBody AssistantDtos.ChatRequest request,
                            @AuthenticationPrincipal Jwt jwt,
                            @RequestParam(required = false) UUID conversationId) {
        UUID userId = principal(jwt);
        return assistantService.chat(request, jwt, userId, conversationId);
    }

    @PostMapping("/confirm/{draftId}")
    @PreAuthorize("isAuthenticated()")
    public AssistantDtos.DraftResponse confirm(@PathVariable UUID draftId,
                                                @AuthenticationPrincipal Jwt jwt) {
        return assistantService.confirmDraft(draftId, principal(jwt));
    }

    @PostMapping("/reject/{draftId}")
    @PreAuthorize("isAuthenticated()")
    public void reject(@PathVariable UUID draftId) {
        assistantService.rejectDraft(draftId);
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); }
        catch (Exception ignored) { return null; }
    }
}
