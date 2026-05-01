package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "payment-service")
public interface PaymentFeign {

    record PaymentStats(long count, BigDecimal totalIn, BigDecimal totalOut) {}
    record ByMethodRow(String method, BigDecimal total, long count) {}
    record ExpenseStats(BigDecimal total, long count) {}

    @GetMapping("/api/v1/payments/stats")
    PaymentStats paymentStats(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                              @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                              @RequestParam(value = "accountId", required = false) UUID accountId);

    @GetMapping("/api/v1/payments/by-method")
    List<ByMethodRow> byMethod(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                               @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo);

    @GetMapping("/api/v1/expenses/stats")
    ExpenseStats expenseStats(@RequestParam(value = "dateFrom", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                              @RequestParam(value = "dateTo",   required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo);
}
