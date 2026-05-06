/**
 * Financial statements — Trial Balance, P&L, Balance Sheet in one tabbed page.
 * Each tab fetches independently when activated to keep the initial paint fast.
 */
import { type ReactNode, useEffect, useState } from 'react';
import {
  Alert, Box, Card, CircularProgress, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';

import {
  getBalanceSheet, getProfitAndLoss, getTrialBalance,
  type BalanceSheet, type ProfitAndLoss, type TrialBalance,
} from 'src/api/smartpos/accounting';
import PageHeader from 'src/components/smartpos/PageHeader';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const fmt = formatMoney;

const cardSx = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '8px',
  overflow: 'hidden',
  bgcolor: '#fff',
  boxShadow: `0 1px 2px ${brand.neutral[900]}08, 0 24px 60px -44px ${brand.neutral[900]}55`,
};

// ── Shared data-fetching wrapper ────────────────────────────────────────────

function StatementLoader<T>({
  fetch,
  deps,
  render,
}: {
  fetch: () => Promise<T>;
  deps: unknown[];
  render: (data: T) => ReactNode;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (loading) return <CircularProgress size={20} />;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!data)   return null;
  return <>{render(data)}</>;
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FinancialStatementsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'TB' | 'PL' | 'BS'>('TB');
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo]     = useState(todayIso());

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader title="Financial statements" subtitle="Trial Balance, Profit &amp; Loss, Balance Sheet" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="TB" label="Trial balance" />
        <Tab value="PL" label="Profit &amp; Loss" />
        <Tab value="BS" label="Balance sheet" />
      </Tabs>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        {tab !== 'BS' && (
          <TextField size="small" type="date" label="From" value={from}
            onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }} />
        )}
        <TextField size="small" type="date" label={tab === 'BS' ? 'As of' : 'To'} value={to}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }} />
      </Stack>

      {tab === 'TB' && (
        <StatementLoader
          fetch={() => getTrialBalance(from, to)}
          deps={[from, to, user?.tenantId]}
          render={(data) => <TrialBalanceView data={data} />}
        />
      )}
      {tab === 'PL' && (
        <StatementLoader
          fetch={() => getProfitAndLoss(from, to)}
          deps={[from, to, user?.tenantId]}
          render={(data) => <ProfitLossView data={data} />}
        />
      )}
      {tab === 'BS' && (
        <StatementLoader
          fetch={() => getBalanceSheet(to)}
          deps={[to, user?.tenantId]}
          render={(data) => <BalanceSheetView data={data} />}
        />
      )}
    </Box>
  );
}

// ── View components (pure rendering, no data fetching) ─────────────────────

function TrialBalanceView({ data }: { data: TrialBalance }) {
  return (
    <Card elevation={0} sx={cardSx}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Account</TableCell>
              <TableCell sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Class</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Debit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Credit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={r.accountId} sx={{ '&:hover': { bgcolor: brand.primary[50] }, transition: 'background 0.14s ease' }}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.accountClass}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.debit ? fmt(r.debit) : ''}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.credit ? fmt(r.credit) : ''}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: brand.neutral[50] }}>
              <TableCell colSpan={3} sx={{ fontWeight: 700, color: brand.neutral[800] }}>Totals</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: brand.neutral[800] }}>{fmt(data.totalDebit)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: brand.neutral[800] }}>{fmt(data.totalCredit)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}

function ProfitLossView({ data }: { data: ProfitAndLoss }) {
  return (
    <Stack spacing={2}>
      <StatementSection title="Revenue" rows={data.revenue.map((r) => [r.code, r.name, r.amount])} total={data.totalRevenue} />
      <StatementSection title="Expenses" rows={data.expenses.map((r) => [r.code, r.name, r.amount])} total={data.totalExpense} />
      <Box sx={{
        bgcolor: data.netIncome >= 0 ? brand.success.light : brand.error.light,
        color:   data.netIncome >= 0 ? brand.success.dark  : brand.error.dark,
        p: 2, borderRadius: '8px',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Net income: {fmt(data.netIncome)}
        </Typography>
      </Box>
    </Stack>
  );
}

function BalanceSheetView({ data }: { data: BalanceSheet }) {
  return (
    <Stack spacing={2}>
      <StatementSection title="Assets" rows={data.assets.map((r) => [r.code, r.name, r.balance])} total={data.totalAssets} />
      <StatementSection title="Liabilities" rows={data.liabilities.map((r) => [r.code, r.name, r.balance])} total={data.totalLiabilities} />
      <StatementSection
        title="Equity"
        rows={[
          ...data.equity.map((r) => [r.code, r.name, r.balance] as [string, string, number]),
          ['—', 'Retained earnings (period to date)', data.retainedEarnings],
        ]}
        total={data.totalEquity}
      />
      <Box sx={{ bgcolor: brand.neutral[50], p: 2, borderRadius: '8px' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
          Assets {fmt(data.totalAssets)} = Liabilities {fmt(data.totalLiabilities)} + Equity {fmt(data.totalEquity)}
        </Typography>
      </Box>
    </Stack>
  );
}

function StatementSection({ title, rows, total }: {
  title: string;
  rows: [string, string, number][];
  total: number;
}) {
  return (
    <Card elevation={0} sx={cardSx}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${brand.neutral[200]}`, bgcolor: brand.neutral[50] }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: brand.neutral[800] }}>{title}</Typography>
      </Box>
      <Table size="small">
        <TableBody>
          {rows.map(([code, name, amount], i) => (
            <TableRow key={`${code}-${i}`} sx={{ '&:hover': { bgcolor: brand.primary[50] }, transition: 'background 0.14s ease' }}>
              <TableCell sx={{ fontFamily: 'monospace', width: 100 }}>{code}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: brand.neutral[50] }}>
            <TableCell colSpan={2} sx={{ fontWeight: 700, color: brand.neutral[800] }}>Total {title.toLowerCase()}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: brand.neutral[800] }}>{fmt(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
