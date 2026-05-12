package io.smartpos.payment.api;

import io.smartpos.payment.application.PaymentStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Aggregation endpoints consumed by Report Service. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PaymentStatsController {

    private final PaymentStatsService stats;

    @GetMapping("/payments/stats")
    @PreAuthorize("hasAuthority('report.financial') or hasAuthority('payment.view')")
    public PaymentStatsService.PaymentStats paymentStats(@RequestParam(required = false) LocalDate dateFrom,
                                                         @RequestParam(required = false) LocalDate dateTo,
                                                         @RequestParam(required = false) UUID accountId) {
        return stats.stats(dateFrom, dateTo, accountId);
    }

    @GetMapping("/payments/by-method")
    @PreAuthorize("hasAuthority('report.financial') or hasAuthority('payment.view')")
    public List<PaymentStatsService.ByMethodRow> byMethod(@RequestParam(required = false) LocalDate dateFrom,
                                                          @RequestParam(required = false) LocalDate dateTo) {
        return stats.paymentsByMethod(dateFrom, dateTo);
    }

    @GetMapping("/payments/aging")
    @PreAuthorize("hasAuthority('report.financial') or hasAuthority('payment.view')")
    public List<PaymentStatsService.AgingBucket> aging(@RequestParam(required = false) LocalDate asOf) {
        return stats.aging(asOf);
    }

    @GetMapping("/expenses/stats")
    @PreAuthorize("hasAuthority('report.financial') or hasAuthority('expense.manage')")
    public PaymentStatsService.ExpenseStats expenseStats(@RequestParam(required = false) LocalDate dateFrom,
                                                         @RequestParam(required = false) LocalDate dateTo) {
        return stats.expenseStats(dateFrom, dateTo);
    }
}
