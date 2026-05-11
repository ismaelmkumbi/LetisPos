import { useEffect, useState } from 'react';
import { Box, Tab, Tabs, Typography, Stack, Card, CardContent } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters } from 'src/components/smartpos/reports';
import { getBalanceSheet, getTrialBalance, getCashFlow, type BalanceSheetData, type TrialBalanceData, type CashFlowData } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function FinancialReportPage() {
  const [tab, setTab] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);

  useEffect(() => {
    if (tab === 0 && !balanceSheet) getBalanceSheet({ asOf: filters.dateTo }).then(setBalanceSheet);
    if (tab === 1 && !trialBalance) getTrialBalance({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }).then(setTrialBalance);
    if (tab === 2 && !cashFlow) getCashFlow({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }).then(setCashFlow);
  }, [tab, filters]);

  return (
    <ReportPageShell title="Financial Reports" subtitle="Balance Sheet, Trial Balance, and Cash Flow Statement">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Balance Sheet" />
        <Tab label="Trial Balance" />
        <Tab label="Cash Flow" />
      </Tabs>
      {tab === 0 && balanceSheet && (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Total Assets: {formatMoney(balanceSheet.totalAssets)}</Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>Total Liabilities + Equity: {formatMoney(balanceSheet.totalLiabilitiesEquity)}</Typography>
        </Box>
      )}
      {tab === 1 && trialBalance && (
        <Box>
          <Typography sx={{ mb: 1 }}>Total Debits: {formatMoney(trialBalance.totalDebits)}</Typography>
          <Typography sx={{ mb: 2 }}>Total Credits: {formatMoney(trialBalance.totalCredits)}</Typography>
        </Box>
      )}
      {tab === 2 && cashFlow && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Card sx={{ flex: 1 }}><CardContent>
            <Typography variant="caption">Operating</Typography>
            <Typography variant="h6">{formatMoney(cashFlow.operating)}</Typography>
          </CardContent></Card>
          <Card sx={{ flex: 1 }}><CardContent>
            <Typography variant="caption">Investing</Typography>
            <Typography variant="h6">{formatMoney(cashFlow.investing)}</Typography>
          </CardContent></Card>
          <Card sx={{ flex: 1 }}><CardContent>
            <Typography variant="caption">Financing</Typography>
            <Typography variant="h6">{formatMoney(cashFlow.financing)}</Typography>
          </CardContent></Card>
          <Card sx={{ flex: 1, bgcolor: cashFlow.netChange >= 0 ? brand.success.light : brand.error.light }}><CardContent>
            <Typography variant="caption">Net Change</Typography>
            <Typography variant="h6" color={cashFlow.netChange >= 0 ? brand.success.main : brand.error.main}>{formatMoney(cashFlow.netChange)}</Typography>
          </CardContent></Card>
        </Stack>
      )}
      <ReportExportBar reportKey="financial-statements" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
    </ReportPageShell>
  );
}
