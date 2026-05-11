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
        return new FinancialReportDto.BalanceSheet(List.of(), List.of(), List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
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
