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
    @PreAuthorize("isAuthenticated()")
    public PaymentStatsService.PaymentStats paymentStats(@RequestParam(required = false) LocalDate dateFrom,
                                                         @RequestParam(required = false) LocalDate dateTo,
                                                         @RequestParam(required = false) UUID accountId) {
        return stats.stats(dateFrom, dateTo, accountId);
    }

    @GetMapping("/payments/by-method")
    @PreAuthorize("isAuthenticated()")
    public List<PaymentStatsService.ByMethodRow> byMethod(@RequestParam(required = false) LocalDate dateFrom,
                                                          @RequestParam(required = false) LocalDate dateTo) {
        return stats.paymentsByMethod(dateFrom, dateTo);
    }

    @GetMapping("/payments/aging")
    @PreAuthorize("isAuthenticated()")
    public List<PaymentStatsService.AgingBucket> aging(@RequestParam(required = false) LocalDate asOf) {
        return stats.aging(asOf);
    }

    @GetMapping("/payments/ar-aging")
    @PreAuthorize("isAuthenticated()")
    public List<PaymentStatsService.AgingBucket> arAging(@RequestParam(required = false) LocalDate asOf) {
        return stats.arAging(asOf);
    }

    @GetMapping("/payments/ap-aging")
    @PreAuthorize("isAuthenticated()")
    public List<PaymentStatsService.AgingBucket> apAging(@RequestParam(required = false) LocalDate asOf) {
        return stats.apAging(asOf);
    }

    @GetMapping("/expenses/stats")
    @PreAuthorize("hasAuthority('report.financial') or hasAuthority('expense.manage')")
    public PaymentStatsService.ExpenseStats expenseStats(@RequestParam(required = false) LocalDate dateFrom,
                                                         @RequestParam(required = false) LocalDate dateTo) {
        return stats.expenseStats(dateFrom, dateTo);
    }
}
