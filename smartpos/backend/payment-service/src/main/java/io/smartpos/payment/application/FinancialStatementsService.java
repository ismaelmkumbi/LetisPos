package io.smartpos.payment.application;

import io.smartpos.payment.api.dto.FinancialReports.*;
import io.smartpos.payment.domain.model.AccountClass;
import io.smartpos.payment.domain.model.ChartOfAccount;
import io.smartpos.payment.domain.repository.ChartOfAccountRepository;
import io.smartpos.payment.domain.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Builds Trial Balance, P&amp;L and Balance Sheet from POSTED journal entries.
 *
 * Net balance per account = sum(debit) - sum(credit). For Trial Balance we
 * present the absolute balance on the side that matches the account's
 * normal-balance side (DR or CR), matching the standard report convention.
 *
 * Balance Sheet rolls open-to-now and includes "Retained Earnings" as the
 * net of REVENUE - EXPENSE up to the as-of date (closing entries are not
 * required at the source-of-truth level for this report).
 */
@Service
@RequiredArgsConstructor
public class FinancialStatementsService {

    private final JournalEntryRepository journalRepo;
    private final ChartOfAccountRepository coaRepo;

    @Transactional(readOnly = true)
    public TrialBalance trialBalance(LocalDate from, LocalDate to) {
        Map<UUID, BigDecimal[]> totals = totalsByAccount(from, to);
        Map<UUID, ChartOfAccount> coa = coaIndex();

        List<TrialBalance.Row> rows = new ArrayList<>();
        BigDecimal sumDr = BigDecimal.ZERO, sumCr = BigDecimal.ZERO;

        for (Map.Entry<UUID, BigDecimal[]> e : totals.entrySet()) {
            ChartOfAccount acc = coa.get(e.getKey());
            if (acc == null) continue;
            BigDecimal dr = e.getValue()[0];
            BigDecimal cr = e.getValue()[1];
            BigDecimal net = dr.subtract(cr);

            // Place the absolute balance on the natural side.
            BigDecimal showDr = BigDecimal.ZERO, showCr = BigDecimal.ZERO;
            if ("DR".equals(acc.getNormalBalance())) {
                if (net.signum() >= 0) showDr = net; else showCr = net.abs();
            } else {
                if (net.signum() <= 0) showCr = net.abs(); else showDr = net;
            }
            rows.add(new TrialBalance.Row(acc.getId(), acc.getCode(), acc.getName(),
                    acc.getAccountClass(), showDr, showCr));
            sumDr = sumDr.add(showDr);
            sumCr = sumCr.add(showCr);
        }
        rows.sort(Comparator.comparing(TrialBalance.Row::code));
        return new TrialBalance(from, to, rows, sumDr, sumCr);
    }

    @Transactional(readOnly = true)
    public ProfitAndLoss profitAndLoss(LocalDate from, LocalDate to) {
        Map<UUID, BigDecimal[]> totals = totalsByAccount(from, to);
        Map<UUID, ChartOfAccount> coa = coaIndex();

        List<ProfitAndLoss.Line> revenue  = new ArrayList<>();
        List<ProfitAndLoss.Line> expenses = new ArrayList<>();
        BigDecimal totalRev = BigDecimal.ZERO, totalExp = BigDecimal.ZERO;

        for (Map.Entry<UUID, BigDecimal[]> e : totals.entrySet()) {
            ChartOfAccount acc = coa.get(e.getKey());
            if (acc == null || !acc.getAccountClass().isProfitAndLoss()) continue;
            BigDecimal dr = e.getValue()[0];
            BigDecimal cr = e.getValue()[1];
            // Revenue (CR-normal): show CR-DR; Expense (DR-normal): show DR-CR.
            BigDecimal amt = (acc.getAccountClass() == AccountClass.REVENUE)
                    ? cr.subtract(dr)
                    : dr.subtract(cr);
            ProfitAndLoss.Line line = new ProfitAndLoss.Line(acc.getId(), acc.getCode(), acc.getName(), amt);
            if (acc.getAccountClass() == AccountClass.REVENUE) {
                revenue.add(line);  totalRev = totalRev.add(amt);
            } else {
                expenses.add(line); totalExp = totalExp.add(amt);
            }
        }
        revenue.sort(Comparator.comparing(ProfitAndLoss.Line::code));
        expenses.sort(Comparator.comparing(ProfitAndLoss.Line::code));
        return new ProfitAndLoss(from, to, revenue, expenses, totalRev, totalExp,
                totalRev.subtract(totalExp));
    }

    @Transactional(readOnly = true)
    public BalanceSheet balanceSheet(LocalDate asOf) {
        // Balance sheet is point-in-time: from = NULL (opening), to = asOf.
        Map<UUID, BigDecimal[]> totals = totalsByAccount(null, asOf);
        Map<UUID, ChartOfAccount> coa = coaIndex();

        List<BalanceSheet.Section> assets = new ArrayList<>();
        List<BalanceSheet.Section> liabilities = new ArrayList<>();
        List<BalanceSheet.Section> equity = new ArrayList<>();
        BigDecimal totalA = BigDecimal.ZERO, totalL = BigDecimal.ZERO, totalE = BigDecimal.ZERO;
        BigDecimal totalRev = BigDecimal.ZERO, totalExp = BigDecimal.ZERO;

        for (Map.Entry<UUID, BigDecimal[]> e : totals.entrySet()) {
            ChartOfAccount acc = coa.get(e.getKey());
            if (acc == null) continue;
            BigDecimal dr = e.getValue()[0];
            BigDecimal cr = e.getValue()[1];

            switch (acc.getAccountClass()) {
                case ASSET -> {
                    BigDecimal bal = dr.subtract(cr);
                    assets.add(new BalanceSheet.Section(acc.getId(), acc.getCode(), acc.getName(), bal));
                    totalA = totalA.add(bal);
                }
                case LIABILITY -> {
                    BigDecimal bal = cr.subtract(dr);
                    liabilities.add(new BalanceSheet.Section(acc.getId(), acc.getCode(), acc.getName(), bal));
                    totalL = totalL.add(bal);
                }
                case EQUITY -> {
                    BigDecimal bal = cr.subtract(dr);
                    equity.add(new BalanceSheet.Section(acc.getId(), acc.getCode(), acc.getName(), bal));
                    totalE = totalE.add(bal);
                }
                case REVENUE -> totalRev = totalRev.add(cr.subtract(dr));
                case EXPENSE -> totalExp = totalExp.add(dr.subtract(cr));
            }
        }
        assets.sort(Comparator.comparing(BalanceSheet.Section::code));
        liabilities.sort(Comparator.comparing(BalanceSheet.Section::code));
        equity.sort(Comparator.comparing(BalanceSheet.Section::code));

        BigDecimal retained = totalRev.subtract(totalExp);
        BigDecimal totalEquityWithRetained = totalE.add(retained);
        return new BalanceSheet(asOf, assets, liabilities, equity,
                totalA, totalL, totalEquityWithRetained, retained);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private Map<UUID, BigDecimal[]> totalsByAccount(LocalDate from, LocalDate to) {
        Map<UUID, BigDecimal[]> out = new HashMap<>();
        for (Object[] row : journalRepo.sumByAccount(from, to)) {
            out.put((UUID) row[0],
                    new BigDecimal[]{ (BigDecimal) row[1], (BigDecimal) row[2] });
        }
        return out;
    }

    private Map<UUID, ChartOfAccount> coaIndex() {
        Map<UUID, ChartOfAccount> m = new HashMap<>();
        for (ChartOfAccount c : coaRepo.findAll()) m.put(c.getId(), c);
        return m;
    }
}
