package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.application.InsightService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final InsightService insightService;

    @PostMapping("/sales-trend")
    @PreAuthorize("hasAuthority('ai.insight')")
    public AiDtos.InsightResponse salesTrend(@Valid @RequestBody AiDtos.SalesTrendRequest req,
                                             @AuthenticationPrincipal Jwt jwt) {
        return insightService.salesTrend(req, principal(jwt));
    }

    @PostMapping("/narrate")
    @PreAuthorize("hasAuthority('ai.insight')")
    public AiDtos.InsightResponse narrate(@Valid @RequestBody AiDtos.NarrateRequest req,
                                          @AuthenticationPrincipal Jwt jwt) {
        return insightService.narrate(req, principal(jwt));
    }

    @PostMapping("/chat")
    @PreAuthorize("hasAuthority('ai.chat')")
    public AiDtos.InsightResponse chat(@Valid @RequestBody AiDtos.ChatRequest req,
                                       @AuthenticationPrincipal Jwt jwt) {
        return insightService.chat(req, principal(jwt));
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); } catch (Exception ignored) { return null; }
    }
}

/**
 * Internal endpoints for service-to-service calls. No JWT required;
 * path /api/internal/** is whitelisted in SecurityConfig.
 */
@RestController
@RequestMapping("/api/internal/ai")
@RequiredArgsConstructor
class InternalAiController {

    private final InsightService insightService;

    @PostMapping("/chat")
    public AiDtos.InsightResponse chat(@RequestBody AiDtos.ChatRequest req) {
        return insightService.chat(req, null);
    }
}
