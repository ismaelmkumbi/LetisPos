/**
 * Recurring invoices — list with status badge, next-run date, and lifecycle
 * actions (pause / resume / cancel / run-now).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlayerPlay, IconPlayerPause, IconPlus, IconRocket, IconX, IconRepeat, IconCalendarClock, IconClock } from '@tabler/icons-react';

import {
  cancelRecurring, listRecurring, pauseRecurring, resumeRecurring, runNow,
  type RecurringInvoice, type RecurringStatus,
} from 'src/api/smartpos/recurring';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import MetricCard from 'src/components/smartpos/MetricCard';
import RecurringEditDrawer from './RecurringEditDrawer';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<RecurringStatus, { bg: string; fg: string }> = {
  ACTIVE:    { bg: brand.success.light, fg: brand.success.dark },
  PAUSED:    { bg: brand.warning.light, fg: brand.warning.dark },
  COMPLETED: { bg: brand.info.light,    fg: brand.info.dark },
  CANCELLED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

export default function RecurringInvoicesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RecurringInvoice[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<RecurringStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'ACTIVE');
    const upcoming = active.filter((r) => {
      if (!r.nextRunDate) return false;
      const d = new Date(r.nextRunDate);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return d <= weekFromNow;
    });
    return { activeCount: active.length, upcomingCount: upcoming.length };
  }, [rows]);

  const PAGE_SIZE = 20;

  const relativeNextRun = (date: string | null): string => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRecurring({ status: status || undefined, page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status, page, refreshToken, user?.tenantId]);

  const cols: Column<RecurringInvoice>[] = useMemo(() => [
    {
      key: '_num',
      label: '#',
      width: 52,
      align: 'center' as const,
      sortable: false,
      enableHiding: false,
      render: (_r, i) => (
        <Typography
          sx={{
            fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400],
            fontFamily: "'DM Mono', 'Courier New', monospace", letterSpacing: '-0.02em',
          }}
        >
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Template', width: 200,
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '10px',
              bgcolor: brand.info.light,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconRepeat size={16} color={brand.info.dark} stroke={1.8} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace",
                fontSize: '0.8rem', color: brand.neutral[800],
                letterSpacing: '-0.02em', lineHeight: 1.3,
              }}
              noWrap
            >
              {r.ref}
            </Typography>
            {r.name && <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>{r.name}</Typography>}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'cadence', label: 'Cadence',
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
          Every {r.intervalCount} {r.frequency.toLowerCase()}
        </Typography>
      ),
    },
    {
      key: 'nextRunDate', label: 'Next run',
      render: (r) => {
        const rel = relativeNextRun(r.nextRunDate);
        const isOverdue = rel === 'Overdue';
        const isSoon = rel === 'Today' || rel === 'Tomorrow';
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconClock size={14} color={isOverdue ? brand.operational.critical.dot : isSoon ? brand.operational.attention.dot : brand.neutral[400]} stroke={1.5} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                {r.nextRunDate ? new Date(r.nextRunDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: isOverdue ? brand.operational.critical.text : isSoon ? brand.operational.attention.text : brand.neutral[500],
                }}
              >
                {rel}
              </Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      key: 'occurrencesCount', label: 'Runs', width: 90, align: 'right' as const,
      render: (r) => (
        <Typography sx={{ fontWeight: 600, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.78rem', color: brand.neutral[700] }}>
          {r.occurrencesMax ? `${r.occurrencesCount}/${r.occurrencesMax}` : `${r.occurrencesCount}`}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 110, align: 'center' as const,
      render: (r) => {
        const c = STATUS_COLOURS[r.status];
        return (
          <Chip
            label={r.status}
            size="small"
            sx={{
              height: 22, fontWeight: 700, fontSize: '0.65rem',
              letterSpacing: '0.03em', bgcolor: c.bg, color: c.fg,
              borderRadius: '6px', '.MuiChip-label': { px: 1 },
            }}
          />
        );
      },
    },
    {
      key: 'actions', label: '', align: 'right' as const,
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {r.status === 'ACTIVE' && (
            <>
              <Button size="small" startIcon={<IconRocket size={14} />} onClick={async () => {
                try { await runNow(r.id); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Run failed'); }
              }}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                Run now
              </Button>
              <Button size="small" startIcon={<IconPlayerPause size={14} />} onClick={async () => {
                try { await pauseRecurring(r.id); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Pause failed'); }
              }}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                Pause
              </Button>
            </>
          )}
          {r.status === 'PAUSED' && (
            <Button size="small" startIcon={<IconPlayerPlay size={14} />} onClick={async () => {
              try { await resumeRecurring(r.id); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Resume failed'); }
            }}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
              Resume
            </Button>
          )}
          {r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && (
            <Button size="small" color="error" startIcon={<IconX size={14} />} onClick={async () => {
              if (!window.confirm('Cancel this template?')) return;
              try { await cancelRecurring(r.id); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Cancel failed'); }
            }}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
              Cancel
            </Button>
          )}
        </Stack>
      ),
    },
  ], [page]);

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Recurring invoices"
        subtitle="Templates that auto-generate Sales on a schedule"
        breadcrumbs={[
          { label: 'Sales Desk', href: '/smartpos/sales' },
          { label: 'Recurring Invoices' },
        ]}
        status={
          stats.activeCount > 0
            ? { state: 'active', label: `${stats.activeCount} active` }
            : { state: 'idle', label: 'No active' }
        }
        action={{
          label: 'New template',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      {/* Metric cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <MetricCard label="Active Templates" value={stats.activeCount} icon={<IconRepeat size={16} />} />
        <MetricCard label="Upcoming This Week" value={stats.upcomingCount} icon={<IconCalendarClock size={16} />} />
      </Stack>

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
        tableKey="recurring-invoices"
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName="recurring-invoices"
        toolbarTitle="Scheduled invoices"
      />

      <RecurringEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />
    </Box>
  );
}
