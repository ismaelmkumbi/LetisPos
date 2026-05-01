package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.FinancialReports.*;
import io.smartpos.payment.application.FinancialStatementsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/financials")
@RequiredArgsConstructor
public class FinancialStatementsController {

    private final FinancialStatementsService service;

    @GetMapping("/trial-balance")
    @PreAuthorize("hasAuthority('report.financial.view')")
    public TrialBalance trialBalance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.trialBalance(from, to);
    }

    @GetMapping("/profit-and-loss")
    @PreAuthorize("hasAuthority('report.financial.view')")
    public ProfitAndLoss profitAndLoss(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.profitAndLoss(from, to);
    }

    @GetMapping("/balance-sheet")
    @PreAuthorize("hasAuthority('report.financial.view')")
    public BalanceSheet balanceSheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        return service.balanceSheet(asOf);
    }
}
