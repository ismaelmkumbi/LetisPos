package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProfitLossDto(
        LocalDate from,
        LocalDate to,
        BigDecimal revenueGross,         // sales.gross
        BigDecimal revenueDiscount,      // sales.discount
        BigDecimal revenueNet,           // sales.net
        BigDecimal costOfGoodsSold,      // purchases.net (approximation)
        BigDecimal grossProfit,          // revenueNet - costOfGoodsSold
        BigDecimal operatingExpenses,    // expenses.total
        BigDecimal netProfit             // grossProfit - operatingExpenses
) {}
