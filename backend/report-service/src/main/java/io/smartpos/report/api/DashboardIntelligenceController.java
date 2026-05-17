package io.smartpos.report.api;

import io.smartpos.report.api.dto.DashboardIntelligenceDto;
import io.smartpos.report.api.dto.ExecutiveSummaryDto;
import io.smartpos.report.api.dto.UnifiedResponse;
import io.smartpos.report.application.DashboardIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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

    /**
     * AI-generated executive summary with rule-based template fallback.
     * Cached for 1 hour per tenant per date. Pass ?refresh=true to bypass the cache.
     */
    @GetMapping("/executive-summary")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public UnifiedResponse<ExecutiveSummaryDto> executiveSummary(
        @RequestParam(value = "date", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(value = "refresh", defaultValue = "false") boolean refresh) {
        return refresh
            ? intelligenceService.executiveSummaryUncached(date)
            : intelligenceService.executiveSummary(date);
    }
}
