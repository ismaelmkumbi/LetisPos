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
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import AccountEditDrawer from './AccountEditDrawer';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

const CLASS_COLOURS: Record<AccountClass, { bg: string; fg: string }> = {
  ASSET:     { bg: brand.success.light,  fg: brand.success.dark },
  LIABILITY: { bg: brand.error.light,    fg: brand.error.dark },
  EQUITY:    { bg: brand.accent[50],     fg: brand.accent[700] },
  REVENUE:   { bg: brand.primary[50],    fg: brand.primary[700] },
  EXPENSE:   { bg: brand.warning.light,  fg: brand.warning.dark },
};

export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AccountClass | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  }, [filter, refreshToken, user?.tenantId]);

  const grouped = useMemo(() => {
    const out: Record<string, ChartOfAccount[]> = {};
    for (const r of rows) {
      (out[r.accountClass] ||= []).push(r);
    }
    return out;
  }, [rows]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (filter) out.push({ key: 'class', label: `Class: ${filter}`, clear: () => setFilter('') });
    return out;
  }, [filter]);

  const cols: Column<ChartOfAccount>[] = [
    { key: 'code', label: 'Code', width: 120, render: (a) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.code}</span> },
    { key: 'name', label: 'Name' },
    {
      key: 'accountClass', label: 'Class', align: 'center',
      render: (a) => {
        const c = CLASS_COLOURS[a.accountClass];
        return <Chip label={a.accountClass} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600, borderRadius: '6px' }} />;
      },
    },
    { key: 'normalBalance', label: 'Normal', align: 'center', render: (a) => a.normalBalance },
    { key: 'postable', label: 'Postable', align: 'center', render: (a) => a.postable ? '✓' : '—' },
    {
      key: 'active', label: 'Active', align: 'center',
      render: (a) => a.active
        ? <Chip label="On" size="small" sx={{ bgcolor: brand.success.light, color: brand.success.dark, borderRadius: '6px' }} />
        : <Chip label="Off" size="small" sx={{ bgcolor: brand.neutral[100], color: brand.neutral[500], borderRadius: '6px' }} />,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Chart of accounts"
        subtitle="Hierarchical ledger accounts used by every journal entry"
        action={{
          label: 'New account',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <FilterBar
        searchPlaceholder=""
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel=""
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={() => setFilter('')}
      >
        <TextField
          select
          size="small"
          label="Class"
          value={filter}
          onChange={(e) => setFilter(e.target.value as AccountClass | '')}
          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          {(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'] as AccountClass[]).map((c) =>
            <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </FilterBar>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {filter ? (
        <DataTable
          columns={cols} rows={rows} loading={loading}
          onRowClick={(a) => { setEditing(a); setDrawerOpen(true); }}
          getRowKey={(a) => a.id}
          tableKey="chart-of-accounts"
          enableColumnVisibility
          enableExport
          exportFileName="chart-of-accounts"
          toolbarTitle="GL accounts"
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
                <Card elevation={0} sx={{ mt: 0.5, border: `1px solid ${brand.neutral[200]}`, borderRadius: '8px', overflow: 'hidden' }}>
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
    </Box>
  );
}
