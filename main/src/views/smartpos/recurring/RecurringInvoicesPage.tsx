/**
 * Recurring invoices — list with status badge, next-run date, and lifecycle
 * actions (pause / resume / cancel / run-now).
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlayerPlay, IconPlayerPause, IconPlus, IconRocket, IconX } from '@tabler/icons-react';

import {
  cancelRecurring, listRecurring, pauseRecurring, resumeRecurring, runNow,
  type RecurringInvoice, type RecurringStatus,
} from 'src/api/smartpos/recurring';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import RecurringEditDrawer from './RecurringEditDrawer';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<RecurringStatus, { bg: string; fg: string }> = {
  ACTIVE:    { bg: brand.success.light, fg: brand.success.dark },
  PAUSED:    { bg: brand.warning.light, fg: brand.warning.dark },
  COMPLETED: { bg: brand.info.light,    fg: brand.info.dark },
  CANCELLED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

export default function RecurringInvoicesPage() {
  const [rows, setRows] = useState<RecurringInvoice[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<RecurringStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRecurring({ status: status || undefined, page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status, page, refreshToken]);

  const cols: Column<RecurringInvoice>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (r) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.ref}</Typography>
          {r.name && <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{r.name}</Typography>}
        </Stack>
      ),
    },
    {
      key: 'cadence', label: 'Cadence',
      render: (r) => `Every ${r.intervalCount} ${r.frequency.toLowerCase()}`,
    },
    { key: 'nextRunDate', label: 'Next run', render: (r) => r.nextRunDate },
    {
      key: 'occurrencesCount', label: 'Occurrences', align: 'right',
      render: (r) => r.occurrencesMax ? `${r.occurrencesCount} / ${r.occurrencesMax}` : `${r.occurrencesCount}`,
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (r) => {
        const c = STATUS_COLOURS[r.status];
        return <Chip label={r.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {r.status === 'ACTIVE' && (
            <>
              <Button size="small" startIcon={<IconRocket size={14} />} onClick={async () => {
                try { await runNow(r.id); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Run failed'); }
              }}>Run now</Button>
              <Button size="small" startIcon={<IconPlayerPause size={14} />} onClick={async () => {
                try { await pauseRecurring(r.id); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Pause failed'); }
              }}>Pause</Button>
            </>
          )}
          {r.status === 'PAUSED' && (
            <Button size="small" startIcon={<IconPlayerPlay size={14} />} onClick={async () => {
              try { await resumeRecurring(r.id); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Resume failed'); }
            }}>Resume</Button>
          )}
          {r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && (
            <Button size="small" color="error" startIcon={<IconX size={14} />} onClick={async () => {
              if (!window.confirm('Cancel this template?')) return;
              try { await cancelRecurring(r.id); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Cancel failed'); }
            }}>Cancel</Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Recurring invoices"
        subtitle="Templates that auto-generate Sales on a schedule"
        action={{
          label: 'New template',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as RecurringStatus | ''); setPage(0); }}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {(['ACTIVE','PAUSED','COMPLETED','CANCELLED'] as RecurringStatus[]).map((s) =>
            <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(r) => { setEditing(r); setDrawerOpen(true); }}
        getRowKey={(r) => r.id}
      />

      <RecurringEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />
    </>
  );
}
