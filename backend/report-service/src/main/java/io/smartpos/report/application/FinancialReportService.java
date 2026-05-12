package io.smartpos.report.application;

import io.smartpos.report.api.dto.FinancialReportDto;
import io.smartpos.report.infrastructure.feign.PaymentFeign;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialReportService {

    private final PaymentFeign paymentFeign;

    @Transactional(readOnly = true)
    public FinancialReportDto.BalanceSheet balanceSheet(LocalDate asOf) {
        UUID tenantId = TenantContext.require();
        try {
            var accounts = paymentFeign.chartOfAccountsSummary();
            var assets = accounts.stream()
                    .filter(a -> "ASSET".equals(a.type()))
                    .map(a -> new FinancialReportDto.AccountGroup(a.code(), a.name(), a.balance(), List.of()))
                    .toList();
            var liabilities = accounts.stream()
                    .filter(a -> "LIABILITY".equals(a.type()))
                    .map(a -> new FinancialReportDto.AccountGroup(a.code(), a.name(), a.balance(), List.of()))
                    .toList();
            var equity = accounts.stream()
                    .filter(a -> "EQUITY".equals(a.type()))
                    .map(a -> new FinancialReportDto.AccountGroup(a.code(), a.name(), a.balance(), List.of()))
                    .toList();
            BigDecimal totalAssets = assets.stream()
                    .map(FinancialReportDto.AccountGroup::balance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalLiabilitiesEquity = liabilities.stream()
                    .map(FinancialReportDto.AccountGroup::balance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .add(equity.stream()
                            .map(FinancialReportDto.AccountGroup::balance)
                            .reduce(BigDecimal.ZERO, BigDecimal::add));
            return new FinancialReportDto.BalanceSheet(
                    assets, liabilities, equity, totalAssets, totalLiabilitiesEquity);
        } catch (Exception e) {
            log.warn("Failed to fetch balance sheet: {}", e.getMessage());
            return new FinancialReportDto.BalanceSheet(
                    List.of(), List.of(), List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
        }
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
