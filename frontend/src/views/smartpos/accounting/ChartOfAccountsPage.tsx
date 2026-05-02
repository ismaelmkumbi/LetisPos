/**
 * Chart of Accounts list — grouped by account class.
 * Quick add inline; clicking a row opens the edit drawer.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Card, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

import {
  listAccounts, type AccountClass, type ChartOfAccount,
} from 'src/api/smartpos/accounting';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import AccountEditDrawer from './AccountEditDrawer';
import { brand } from 'src/theme/smartpos/brand';

const CLASS_COLOURS: Record<AccountClass, { bg: string; fg: string }> = {
  ASSET:     { bg: brand.success.light,  fg: brand.success.dark },
  LIABILITY: { bg: brand.error.light,    fg: brand.error.dark },
  EQUITY:    { bg: brand.accent[50],     fg: brand.accent[700] },
  REVENUE:   { bg: brand.primary[50],    fg: brand.primary[700] },
  EXPENSE:   { bg: brand.warning.light,  fg: brand.warning.dark },
};

export default function ChartOfAccountsPage() {
  const [rows, setRows] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AccountClass | ''>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAccount | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAccounts(filter || undefined)
      .then((items) => !cancelled && setRows(items))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filter, refreshToken]);

  const grouped = useMemo(() => {
    const out: Record<string, ChartOfAccount[]> = {};
    for (const r of rows) {
      (out[r.accountClass] ||= []).push(r);
    }
    return out;
  }, [rows]);

  const cols: Column<ChartOfAccount>[] = [
    { key: 'code', label: 'Code', width: 120, render: (a) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.code}</span> },
    { key: 'name', label: 'Name' },
    {
      key: 'accountClass', label: 'Class', align: 'center',
      render: (a) => {
        const c = CLASS_COLOURS[a.accountClass];
        return <Chip label={a.accountClass} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'normalBalance', label: 'Normal', align: 'center', render: (a) => a.normalBalance },
    { key: 'postable', label: 'Postable', align: 'center', render: (a) => a.postable ? '✓' : '—' },
    {
      key: 'active', label: 'Active', align: 'center',
      render: (a) => a.active
        ? <Chip label="On" size="small" sx={{ bgcolor: brand.success.light, color: brand.success.dark }} />
        : <Chip label="Off" size="small" sx={{ bgcolor: brand.neutral[100], color: brand.neutral[500] }} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Chart of accounts"
        subtitle="Hierarchical ledger accounts used by every journal entry"
        action={{
          label: 'New account',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Class" value={filter}
          onChange={(e) => setFilter(e.target.value as AccountClass | '')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'] as AccountClass[]).map((c) =>
            <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {filter ? (
        <DataTable
          columns={cols} rows={rows} loading={loading}
          onRowClick={(a) => { setEditing(a); setDrawerOpen(true); }}
          getRowKey={(a) => a.id}
        />
      ) : (
        <Stack spacing={3}>
          {(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'] as AccountClass[]).map((cls) => {
            const items = grouped[cls] ?? [];
            if (items.length === 0) return null;
            return (
              <Box key={cls}>
                <Typography variant="overline" sx={{ color: brand.neutral[500], fontWeight: 700 }}>
                  {cls} ({items.length})
                </Typography>
                <Card elevation={0} sx={{ mt: 0.5 }}>
                  <DataTable
                    columns={cols} rows={items} loading={false}
                    onRowClick={(a) => { setEditing(a); setDrawerOpen(true); }}
                    getRowKey={(a) => a.id}
                  />
                </Card>
              </Box>
            );
          })}
        </Stack>
      )}

      <AccountEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />
    </>
  );
}
