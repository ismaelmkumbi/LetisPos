/**
 * Chart of Accounts list — grouped by account class.
 * Quick add inline; clicking a row opens the edit drawer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, Collapse, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconChevronDown, IconChevronRight, IconPlus } from '@tabler/icons-react';

import {
  listAccounts, listTemplates, activateAccount, initializeAccounting,
  type AccountClass, type ChartOfAccount, type AccountingSetupResult,
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
  const [templates, setTemplates] = useState<ChartOfAccount[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [activating, setActivating] = useState<Set<string>>(new Set());
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState<AccountingSetupResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAccounts(filter || undefined)
      .then((items) => !cancelled && setRows(items))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filter, refreshToken, user?.tenantId]);

  const loadTemplates = useCallback(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const handleActivate = useCallback(async (id: string) => {
    setActivating((prev) => new Set(prev).add(id));
    try {
      await activateAccount(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setRefreshToken((x) => x + 1);
    } catch {
      // ignore
    } finally {
      setActivating((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, []);

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

      {/* ── One-click accounting setup ─────────────────────────────────── */}
      {!loading && rows.length === 0 && !initResult && (
        <Alert
          severity="info"
          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}
          action={
            <Button
              variant="contained"
              size="small"
              disabled={initializing}
              onClick={async () => {
                setInitializing(true);
                try {
                  const result = await initializeAccounting();
                  setInitResult(result);
                  setRefreshToken((x) => x + 1);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Setup failed');
                } finally {
                  setInitializing(false);
                }
              }}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              {initializing ? 'Setting up…' : 'Initialize Accounting'}
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            No Chart of Accounts found for this business.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click to create the full accounting setup — COA tree, cash accounts, posting rules, and categories.
          </Typography>
        </Alert>
      )}

      {initResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInitResult(null)}>
          Accounting setup complete: {initResult.coaEntries} COA entries, {initResult.operationalAccounts} accounts, {initResult.postingRules} posting rules, {initResult.expenseCategories} expense categories, {initResult.depositCategories} deposit categories.
        </Alert>
      )}

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

      {/* ── Available templates ──────────────────────────────────────────── */}
      {!filter && (
        <Box sx={{ mt: 3 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => { if (!templatesOpen) loadTemplates(); setTemplatesOpen(!templatesOpen); }}
            endIcon={templatesOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            sx={{ color: brand.neutral[500], textTransform: 'none', fontWeight: 600 }}
          >
            Available account templates ({templates.length > 0 ? templates.length : '…'})
          </Button>
          <Collapse in={templatesOpen}>
            {templates.length === 0 ? (
              <Typography variant="body2" sx={{ mt: 1, color: brand.neutral[400], fontStyle: 'italic' }}>
                No templates available. All accounts are active — you can create custom ones with "New account".
              </Typography>
            ) : (
              <Card elevation={0} sx={{ mt: 1, border: `1px solid ${brand.neutral[200]}`, borderRadius: '8px', overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1, bgcolor: brand.warning.light, borderBottom: `1px solid ${brand.neutral[200]}` }}>
                  <Typography variant="caption" sx={{ color: brand.warning.dark, fontWeight: 600 }}>
                    These accounts are inactive. Activate the ones your business needs — you can rename them after.
                  </Typography>
                </Box>
                <DataTable
                  columns={[
                    ...cols,
                    {
                      key: 'activate', label: '', align: 'center', width: 100,
                      render: (a: ChartOfAccount) => (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={activating.has(a.id)}
                          onClick={(e) => { e.stopPropagation(); handleActivate(a.id); }}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem', minWidth: 80 }}
                        >
                          {activating.has(a.id) ? '…' : 'Activate'}
                        </Button>
                      ),
                    },
                  ]}
                  rows={templates}
                  loading={false}
                  getRowKey={(a) => a.id}
                  tableKey="coa-templates"
                />
              </Card>
            )}
          </Collapse>
        </Box>
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
