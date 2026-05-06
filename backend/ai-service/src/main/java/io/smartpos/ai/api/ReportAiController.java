package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.api.dto.ReportAiDtos;
import io.smartpos.ai.application.AnomalyService;
import io.smartpos.ai.application.InsightService;
import io.smartpos.ai.application.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/reports")
@RequiredArgsConstructor
public class ReportAiController {

    private final AnomalyService       anomalyService;
    private final RecommendationService recommendationService;
    private final InsightService       insightService;

    @PostMapping("/anomalies")
    @PreAuthorize("hasAuthority('ai.insight')")
    public ReportAiDtos.AnomalyResponse anomalies(@Valid @RequestBody ReportAiDtos.AnomalyRequest req,
                                                   @AuthenticationPrincipal Jwt jwt) {
        return anomalyService.detect(req, principal(jwt));
    }

    @PostMapping("/recommendations")
    @PreAuthorize("hasAuthority('ai.insight')")
    public ReportAiDtos.RecommendationResponse recommendations(@Valid @RequestBody ReportAiDtos.RecommendationRequest req,
                                                                @AuthenticationPrincipal Jwt jwt) {
        return recommendationService.recommend(req, principal(jwt));
    }

    @PostMapping("/narrate")
    @PreAuthorize("hasAuthority('ai.insight')")
    public AiDtos.InsightResponse narrate(@Valid @RequestBody AiDtos.NarrateRequest req,
                                           @AuthenticationPrincipal Jwt jwt) {
        return insightService.narrate(req, principal(jwt));
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); } catch (Exception ignored) { return null; }
    }
}
