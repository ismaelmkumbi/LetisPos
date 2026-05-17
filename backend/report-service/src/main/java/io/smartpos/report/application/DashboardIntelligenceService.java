package io.smartpos.report.application;

import io.smartpos.report.api.dto.DashboardIntelligenceDto;
import io.smartpos.report.api.dto.UnifiedResponse;
import io.smartpos.report.api.dto.UnifiedResponse.*;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.*;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardIntelligenceService {

    private final SalesFeign sales;
    private final InventoryFeign inventory;
    private final PaymentFeign payments;
    private final AiFeign ai;
    private final DataFreshnessService freshness;

    /**
     * Lightweight health/status check. Pings each downstream service,
     * collects data freshness metadata, and returns a unified response.
     */
    @Cacheable(value = RedisCacheConfig.CACHE_DASHBOARD_INTELLIGENCE,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey('status')")
    public UnifiedResponse<DashboardIntelligenceDto> status() {
        TenantContext.require();

        boolean aiOk    = pingAi();
        boolean salesOk = pingSales();
        boolean invOk   = pingInventory();
        boolean payOk   = pingPayments();

        boolean degraded = !aiOk || !salesOk || !invOk || !payOk;

        DashboardIntelligenceDto dto = new DashboardIntelligenceDto(
            "report-service",
            "0.1.0-SNAPSHOT",
            Instant.now(),
            aiOk, salesOk, invOk, payOk
        );

        DataFreshnessMap fm = freshness.currentFreshness();
        java.util.List<Alert> alerts = freshness.buildAlerts(fm);

        ResponseMeta meta = new ResponseMeta(Instant.now(), fm, alerts);

        return degraded
            ? UnifiedResponse.degraded(dto, meta)
            : UnifiedResponse.ok(dto, meta);
    }

    private boolean pingAi() {
        try { ai.health(); return true; }
        catch (Exception e) { log.warn("ai-service unreachable: {}", e.getMessage()); return false; }
    }
    private boolean pingSales() {
        try { sales.salesStats(null, null, null, null); return true; }
        catch (Exception e) { log.warn("sales-service unreachable: {}", e.getMessage()); return false; }
    }
    private boolean pingInventory() {
        try { inventory.summary(null); return true; }
        catch (Exception e) { log.warn("inventory-service unreachable: {}", e.getMessage()); return false; }
    }
    private boolean pingPayments() {
        try { payments.paymentStats(null, null, null); return true; }
        catch (Exception e) { log.warn("payment-service unreachable: {}", e.getMessage()); return false; }
    }
}
