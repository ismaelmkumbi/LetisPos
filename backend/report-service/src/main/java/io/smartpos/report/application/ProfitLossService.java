package io.smartpos.report.application;

import io.smartpos.report.api.dto.ProfitLossDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfitLossService {

    private final SalesFeign sales;
    private final PaymentFeign payments;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to)",
               unless = "#result == null")
    public ProfitLossDto profitLoss(LocalDate from, LocalDate to) {
        SalesFeign.SaleStats      s   = sales.salesStats(from, to, null, null);
        PaymentFeign.ExpenseStats exp = payments.expenseStats(from, to);

        BigDecimal cogs;
        try {
            cogs = sales.costOfGoodsSold(from, to, null);
        } catch (Exception e) {
            log.warn("costOfGoodsSold failed: {}", e.getMessage());
            cogs = nz(sales.purchaseStats(from, to, null).gross()); // fallback
        }

        BigDecimal revenueGross    = nz(s.gross());
        BigDecimal revenueDiscount = nz(s.discount());
        BigDecimal revenueNet      = nz(s.net());
        BigDecimal grossProfit     = revenueNet.subtract(cogs);
        BigDecimal opex            = nz(exp.total());
        BigDecimal netProfit       = grossProfit.subtract(opex);

        return new ProfitLossDto(from, to,
                revenueGross, revenueDiscount, revenueNet,
                cogs, grossProfit, opex, netProfit);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
