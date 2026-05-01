package io.smartpos.report.application;

import io.smartpos.report.api.dto.ProfitLossDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ProfitLossService {

    private final SalesFeign sales;
    private final PaymentFeign payments;

    /**
     * Approximate P&L:
     *   revenue       = sales net (sum grand_total − header discounts)
     *   COGS          = purchases gross (treating all purchased goods as cost)
     *   gross profit  = revenue − COGS
     *   opex          = sum of expenses
     *   net profit    = gross profit − opex
     *
     * This is a *reporting* approximation — not GAAP. Proper inventory
     * accounting (FIFO/LIFO/weighted average) requires tracking cost at
     * sale line time, which we'll add in Phase 6b.
     */
    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "#from + ':' + #to",
               unless = "#result == null")
    public ProfitLossDto profitLoss(LocalDate from, LocalDate to) {
        SalesFeign.SaleStats      s   = sales.salesStats(from, to, null, null);
        SalesFeign.PurchaseStats  p   = sales.purchaseStats(from, to, null);
        PaymentFeign.ExpenseStats exp = payments.expenseStats(from, to);

        BigDecimal revenueGross    = nz(s.gross());
        BigDecimal revenueDiscount = nz(s.discount());
        BigDecimal revenueNet      = nz(s.net());
        BigDecimal cogs            = nz(p.gross());
        BigDecimal grossProfit     = revenueNet.subtract(cogs);
        BigDecimal opex            = nz(exp.total());
        BigDecimal netProfit       = grossProfit.subtract(opex);

        return new ProfitLossDto(from, to,
                revenueGross, revenueDiscount, revenueNet,
                cogs, grossProfit, opex, netProfit);
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
