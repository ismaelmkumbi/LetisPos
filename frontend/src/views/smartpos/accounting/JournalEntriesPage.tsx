/**
 * Journal entries — list + lifecycle actions (post / void).
 * Mirrors backend rules: only DRAFT can be edited, only DRAFT can be posted,
 * only POSTED can be voided.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

import {
  listJournalEntries, postJournalEntry, voidJournalEntry,
  type JournalEntry, type JournalStatus,
} from 'src/api/smartpos/accounting';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import JournalEntryEditDrawer from './JournalEntryEditDrawer';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const STATUS_COLOURS: Record<JournalStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: brand.warning.light, fg: brand.warning.dark },
  POSTED: { bg: brand.success.light, fg: brand.success.dark },
  VOIDED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

const fmt = formatMoney;

const inlineBtnSx = {
  minHeight: 32,
  fontWeight: 700,
  borderRadius: '8px',
  textTransform: 'none' as const,
  fontSize: '0.75rem',
  px: 1.25,
};

export default function JournalEntriesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<JournalStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setEditing(null); setDrawerOpen(true);
      }
      if (e.key === 'Escape') {
        if (status || from || to) { setStatus(''); setFrom(''); setTo(''); setPage(0); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listJournalEntries({
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page, size: 20,
      sort: 'entryDate,desc',
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status, from, to, page, refreshToken, user?.tenantId]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (status) out.push({ key: 'status', label: `Status: ${status}`, clear: () => { setStatus(''); setPage(0); } });
    if (from) out.push({ key: 'from', label: `From: ${from}`, clear: () => { setFrom(''); setPage(0); } });
    if (to) out.push({ key: 'to', label: `To: ${to}`, clear: () => { setTo(''); setPage(0); } });
    return out;
  }, [status, from, to]);

  const cols: Column<JournalEntry>[] = [
    { key: 'ref',  label: 'Ref',  render: (j) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{j.ref}</span> },
    { key: 'date', label: 'Date', render: (j) => j.entryDate },
    { key: 'memo', label: 'Memo' },
    { key: 'source', label: 'Source', render: (j) => j.source + (j.sourceRef ? ` · ${j.sourceRef}` : '') },
    { key: 'totalDebit',  label: 'Debit',  align: 'right', render: (j) => fmt(j.totalDebit) },
    { key: 'totalCredit', label: 'Credit', align: 'right', render: (j) => fmt(j.totalCredit) },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (j) => {
        const c = STATUS_COLOURS[j.status];
        return <Chip label={j.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (j) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {j.status === 'DRAFT' && (
            <Button size="small" variant="outlined" sx={inlineBtnSx} onClick={async () => {
              try { await postJournalEntry(j.id); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Post failed'); }
            }}>Post</Button>
          )}
          {j.status === 'POSTED' && (
            <Button size="small" color="error" variant="outlined" sx={inlineBtnSx} onClick={async () => {
              const reason = window.prompt('Reason for voiding?');
              if (!reason) return;
              try { await voidJournalEntry(j.id, reason); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Void failed'); }
            }}>Void</Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Journal entries"
        subtitle="Manual + system-generated GL postings"
        action={{
          label: 'New entry',
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
        onClearAll={() => { setStatus(''); setFrom(''); setTo(''); setPage(0); }}
      >
        <TextField
          select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as JournalStatus | ''); setPage(0); }}
          sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          {(['DRAFT','POSTED','VOIDED'] as JournalStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="From" value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }} />
        <TextField size="small" type="date" label="To" value={to}
          onChange={(e) => { setTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }} />
      </FilterBar>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(j) => { setEditing(j); setDrawerOpen(true); }}
        getRowKey={(j) => j.id}
        tableKey="journal-entries"
        enableColumnVisibility
        enableExport
        exportFileName="journal-entries"
        toolbarTitle="GL postings"
      />

      <JournalEntryEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />

      <Typography variant="caption" sx={{ color: brand.neutral[500], mt: 2, display: 'block' }}>
        DRAFT entries can be edited; POSTED entries are immutable. Void to reverse a posted entry.
      </Typography>
    </Box>
  );
}
