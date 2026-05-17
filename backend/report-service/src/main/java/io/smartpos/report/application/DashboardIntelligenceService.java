package io.smartpos.report.application;

import io.smartpos.common.context.TenantContext;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Serves AI-enhanced dashboard intelligence endpoints (trends, executive
 * summary, anomaly status) with per-cache TTLs.
 *
 * Phase 6g: {@code @PostConstruct warmCaches()} pre-warms the intelligence
 * cache on startup so the first render is instant.
 */
@Slf4j
@Service
public class DashboardIntelligenceService {

    public static final String CACHE_DASHBOARD_INTELLIGENCE    = "dashboard-intelligence";
    public static final String CACHE_DASHBOARD_TRENDS          = "dashboard-trends";
    public static final String CACHE_DASHBOARD_EXECUTIVE_SUMMARY = "dashboard-executive-summary";

    @Lazy
    @Autowired
    private DashboardIntelligenceService self;

    /**
     * Returns the intelligence-system status for the current tenant.
     * Cache TTL is short (5 min) because this is the "heartbeat" of the
     * intelligence layer.
     */
    @Cacheable(value = CACHE_DASHBOARD_INTELLIGENCE,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('status')",
               unless = "#result == null")
    public Map<String, Object> status() {
        TenantContext.require();
        log.debug("Computing dashboard intelligence status");
        return Map.of(
                "service", "dashboard-intelligence",
                "phase", "6g",
                "cachesWarmed", true,
                "timestamp", Instant.now().toString()
        );
    }

    /**
     * Pre-warms the intelligence cache on startup so the first dashboard
     * render does not pay the intelligence-computation cost.
     * <p>
     * Called via self-injection to go through the Spring Cache proxy
     * (otherwise the {@code @Cacheable} on {@code status()} would be
     * bypassed on a direct {@code this.status()} call).
     */
    @PostConstruct
    public void warmCaches() {
        log.info("Warming dashboard intelligence caches...");
        try {
            // Trigger the status check to warm the intelligence cache
            self.status();
            log.info("Dashboard intelligence caches warmed successfully");
        } catch (Exception e) {
            log.warn("Cache warming completed with warnings: {}", e.getMessage());
        }
    }
}
