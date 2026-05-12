package io.smartpos.report.application;

import io.smartpos.report.api.dto.FinancialReportDto;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FinancialReportService {

    @Transactional(readOnly = true)
    public FinancialReportDto.BalanceSheet balanceSheet(LocalDate asOf) {
        UUID tenantId = TenantContext.require();
        // Return proper empty structure with account groups — gives frontend correct shape.
        // TODO: wire to financial data source once chart-of-accounts is available.
        return new FinancialReportDto.BalanceSheet(
            List.of(new FinancialReportDto.AccountGroup("1", "Assets", BigDecimal.ZERO, List.of())),
            List.of(new FinancialReportDto.AccountGroup("2", "Liabilities", BigDecimal.ZERO, List.of())),
            List.of(new FinancialReportDto.AccountGroup("3", "Equity", BigDecimal.ZERO, List.of())),
            BigDecimal.ZERO, BigDecimal.ZERO
        );
    }

    @Transactional(readOnly = true)
    public FinancialReportDto.TrialBalance trialBalance(LocalDate from, LocalDate to) {
        return new FinancialReportDto.TrialBalance(List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }

    @Transactional(readOnly = true)
    public FinancialReportDto.CashFlowStatement cashFlow(LocalDate from, LocalDate to) {
        return new FinancialReportDto.CashFlowStatement(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
