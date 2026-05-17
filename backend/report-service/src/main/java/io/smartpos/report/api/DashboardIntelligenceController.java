package io.smartpos.report.api;

import io.smartpos.report.api.dto.DashboardIntelligenceDto;
import io.smartpos.report.api.dto.UnifiedResponse;
import io.smartpos.report.application.DashboardIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardIntelligenceController {

    private final DashboardIntelligenceService intelligenceService;

    /**
     * Health/status check for the dashboard intelligence layer.
     * Returns reachability of all downstream services, data freshness
     * metadata, and any alerts about stale or broken data sources.
     */
    @GetMapping("/status")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial') " +
                  "or hasAuthority('report.inventory')")
    public UnifiedResponse<DashboardIntelligenceDto> status() {
        return intelligenceService.status();
    }
}
