package io.smartpos.report.application;

import io.smartpos.report.api.dto.ArAging;
import io.smartpos.report.api.dto.PaymentSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReportService {

    private final PaymentFeign payments;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'pay')",
               unless = "#result == null")
    public PaymentSummaryDto summary(LocalDate from, LocalDate to,
                                      LocalDate priorFrom, LocalDate priorTo) {
        PaymentFeign.PaymentStats stats = safeStats(from, to);
        List<PaymentFeign.ByMethodRow> methods = safeByMethod(from, to);

        BigDecimal netFlow = nz(stats.totalIn()).subtract(nz(stats.totalOut()));

        List<PaymentSummaryDto.ByMethod> byMethod = methods.stream()
                .map(m -> new PaymentSummaryDto.ByMethod(m.method(), m.total(), m.count()))
                .toList();

        // Prior period
        PaymentFeign.PaymentStats priorStats = safeStats(priorFrom, priorTo);
        BigDecimal priorNetFlow = nz(priorStats.totalIn()).subtract(nz(priorStats.totalOut()));
        BigDecimal netFlowChange = netFlow.subtract(priorNetFlow);
        BigDecimal netFlowChangePercent = priorNetFlow.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : netFlowChange.divide(priorNetFlow, 4, RoundingMode.HALF_UP);

        return new PaymentSummaryDto(from, to, stats.count(),
                nz(stats.totalIn()), nz(stats.totalOut()), netFlow,
                BigDecimal.ZERO,
                priorNetFlow, netFlowChange, netFlowChangePercent,
                Collections.emptyList(),
                byMethod);
    }

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'payByMethod')",
               unless = "#result == null")
    public List<PaymentFeign.ByMethodRow> byMethod(LocalDate from, LocalDate to) {
        return safeByMethod(from, to);
    }

    private PaymentFeign.PaymentStats safeStats(LocalDate from, LocalDate to) {
        try { return payments.paymentStats(from, to, null); }
        catch (Exception e) {
            log.warn("paymentStats failed: {}", e.getMessage());
            return new PaymentFeign.PaymentStats(0, BigDecimal.ZERO, BigDecimal.ZERO);
        }
    }

    private List<PaymentFeign.ByMethodRow> safeByMethod(LocalDate from, LocalDate to) {
        try { return payments.byMethod(from, to); }
        catch (Exception e) {
            log.warn("byMethod failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public ArAging aging(LocalDate asOf) {
        // TODO: compute AR aging buckets from open invoices
        return new ArAging(List.of(), BigDecimal.ZERO);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
