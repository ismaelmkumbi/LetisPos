/**
 * Financial statements — Trial Balance, P&L, Balance Sheet in one tabbed page.
 * Each tab fetches independently when activated to keep the initial paint fast.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Box, Card, CircularProgress, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';

import {
  getBalanceSheet, getProfitAndLoss, getTrialBalance,
  type BalanceSheet, type ProfitAndLoss, type TrialBalance,
} from 'src/api/smartpos/accounting';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const fmt = formatMoney;

export default function FinancialStatementsPage() {
  const [tab, setTab] = useState<'TB' | 'PL' | 'BS'>('TB');
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo]     = useState(todayIso());

  return (
    <>
      <PageHeader title="Financial statements" subtitle="Trial Balance, Profit &amp; Loss, Balance Sheet" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="TB" label="Trial balance" />
        <Tab value="PL" label="Profit &amp; Loss" />
        <Tab value="BS" label="Balance sheet" />
      </Tabs>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        {tab !== 'BS' && (
          <TextField size="small" type="date" label="From" value={from}
            onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        )}
        <TextField size="small" type="date" label={tab === 'BS' ? 'As of' : 'To'} value={to}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>

      {tab === 'TB' && <TrialBalanceTab from={from} to={to} />}
      {tab === 'PL' && <ProfitLossTab from={from} to={to} />}
      {tab === 'BS' && <BalanceSheetTab asOf={to} />}
    </>
  );
}

// ------------------------------------------------------------------

function TrialBalanceTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTrialBalance(from, to)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to]);

  if (loading) return <CircularProgress size={20} />;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!data)   return null;

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Class</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={r.accountId}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.accountClass}</TableCell>
                <TableCell align="right">{r.debit ? fmt(r.debit) : ''}</TableCell>
                <TableCell align="right">{r.credit ? fmt(r.credit) : ''}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: brand.neutral[50] }}>
              <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Totals</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(data.totalDebit)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(data.totalCredit)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}

// ------------------------------------------------------------------

function ProfitLossTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<ProfitAndLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProfitAndLoss(from, to)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to]);

  if (loading) return <CircularProgress size={20} />;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!data)   return null;

  return (
    <Stack spacing={2}>
      <Section title="Revenue" rows={data.revenue.map((r) => [r.code, r.name, r.amount])} total={data.totalRevenue} />
      <Section title="Expenses" rows={data.expenses.map((r) => [r.code, r.name, r.amount])} total={data.totalExpense} />
      <Box sx={{
        bgcolor: data.netIncome >= 0 ? brand.success.light : brand.error.light,
        color:   data.netIncome >= 0 ? brand.success.dark  : brand.error.dark,
        p: 2, borderRadius: 2,
      }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Net income: {fmt(data.netIncome)}
        </Typography>
      </Box>
    </Stack>
  );
}

// ------------------------------------------------------------------

function BalanceSheetTab({ asOf }: { asOf: string }) {
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBalanceSheet(asOf)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [asOf]);

  if (loading) return <CircularProgress size={20} />;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!data)   return null;

  return (
    <Stack spacing={2}>
      <Section title="Assets" rows={data.assets.map((r) => [r.code, r.name, r.balance])} total={data.totalAssets} />
      <Section title="Liabilities" rows={data.liabilities.map((r) => [r.code, r.name, r.balance])} total={data.totalLiabilities} />
      <Section
        title="Equity"
        rows={[
          ...data.equity.map((r) => [r.code, r.name, r.balance] as [string, string, number]),
          ['—', 'Retained earnings (period to date)', data.retainedEarnings],
        ]}
        total={data.totalEquity}
      />
      <Box sx={{
        bgcolor: brand.neutral[50],
        p: 2, borderRadius: 2,
      }}>
        <Typography variant="body2">
          Assets {fmt(data.totalAssets)} = Liabilities {fmt(data.totalLiabilities)} + Equity {fmt(data.totalEquity)}
        </Typography>
      </Box>
    </Stack>
  );
}

// ------------------------------------------------------------------

function Section({ title, rows, total }: {
  title: string;
  rows: [string, string, number][];
  total: number;
}) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${brand.neutral[200]}` }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Box>
      <Table size="small">
        <TableBody>
          {rows.map(([code, name, amount], i) => (
            <TableRow key={`${code}-${i}`}>
              <TableCell sx={{ fontFamily: 'monospace', width: 100 }}>{code}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell align="right">{fmt(amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: brand.neutral[50] }}>
            <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total {title.toLowerCase()}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
