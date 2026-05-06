/**
 * Quotations — proposals, estimates, drafts with full approval workflow.
 *
 * Status flow: DRAFT → SENT → ACCEPTED/REJECTED → CONVERTED
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconPlus, IconSend, IconCheck, IconX, IconArrowRight, IconFileInvoice } from '@tabler/icons-react';

import {
  listQuotations, setQuotationStatus, convertQuotation,
  type Quotation, type QuotationStatus,
} from 'src/api/smartpos/sales';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import QuotationEditDrawer from './QuotationEditDrawer';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const TONE: Record<QuotationStatus, { bg: string; fg: string }> = {
  DRAFT:     { bg: brand.neutral[100], fg: brand.neutral[700] },
  SENT:      { bg: brand.info.light,   fg: brand.info.dark },
  ACCEPTED:  { bg: brand.success.light, fg: brand.success.dark },
  REJECTED:  { bg: brand.error.light,  fg: brand.error.dark },
  CONVERTED: { bg: brand.primary[50],  fg: brand.primary[700] },
};

export default function QuotationsListPage() {
  const [rows, setRows] = useState<Quotation[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuotationStatus | ''>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listQuotations({ status: (status || undefined) as QuotationStatus | undefined, page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, page, refreshToken]);

  const handleStatusAction = async (q: Quotation, newStatus: QuotationStatus) => {
    try {
      if (newStatus === 'CONVERTED') {
        await convertQuotation(q.id);
      } else {
        await setQuotationStatus(q.id, newStatus);
      }
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const columns: Column<Quotation>[] = useMemo(() => [
    {
      key: '_num',
      label: '#',
      width: 52,
      align: 'center' as const,
      sortable: false,
      enableHiding: false,
      render: (_q, i) => (
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            color: brand.neutral[400],
            fontFamily: "'DM Mono', 'Courier New', monospace",
            letterSpacing: '-0.02em',
          }}
        >
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Quotation', width: 200,
      render: (q) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '10px',
              bgcolor: brand.primary[50],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconFileInvoice size={16} color={brand.primary[600]} stroke={1.8} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontFamily: "'DM Mono', 'Courier New', monospace",
                fontSize: '0.8rem',
                color: brand.neutral[800],
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
              }}
              noWrap
            >
              {q.ref}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
              {new Date(q.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'customer', label: 'Customer',
      render: (q) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {(q as any).customerName ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 110, align: 'center' as const,
      render: (q) => {
        const t = TONE[q.status];
        return (
          <Chip
            label={q.status}
            size="small"
            sx={{
              height: 22, fontWeight: 700, fontSize: '0.65rem',
              letterSpacing: '0.03em', bgcolor: t.bg, color: t.fg,
              borderRadius: '6px', '.MuiChip-label': { px: 1 },
            }}
          />
        );
      },
    },
    {
      key: 'grandTotal', label: 'Total', width: 120, align: 'right' as const,
      render: (q) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem', color: brand.neutral[800], letterSpacing: '-0.03em' }}>
          {fmt(q.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'items', label: 'Items', width: 70, align: 'right' as const,
      render: (q) => (
        <Typography sx={{ fontWeight: 600, color: brand.neutral[600], fontSize: '0.8125rem' }}>
          {q.lines?.length ?? 0}
        </Typography>
      ),
    },
    {
      key: 'expiry', label: 'Expires', width: 120,
      render: (q) => {
        const d = (q as any).expiryDate;
        if (!d) return <Typography sx={{ color: brand.neutral[400], fontSize: '0.8125rem' }}>—</Typography>;
        const expiry = new Date(d);
        const isExpired = expiry < new Date();
        return (
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
              {new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
            {isExpired && (
              <Typography variant="caption" sx={{ color: brand.operational.critical.text, fontWeight: 600 }}>
                Expired
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'actions', label: '', align: 'right' as const,
      render: (q) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {q.status === 'DRAFT' && (
            <Button size="small" startIcon={<IconSend size={14} />}
              onClick={() => handleStatusAction(q, 'SENT')}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
              Send
            </Button>
          )}
          {q.status === 'SENT' && (
            <>
              <Button size="small" startIcon={<IconCheck size={14} />}
                onClick={() => handleStatusAction(q, 'ACCEPTED')}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: brand.success.dark }}>
                Accept
              </Button>
              <Button size="small" startIcon={<IconX size={14} />} color="error"
                onClick={() => handleStatusAction(q, 'REJECTED')}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                Reject
              </Button>
            </>
          )}
          {q.status === 'ACCEPTED' && (
            <Button size="small" variant="contained" startIcon={<IconArrowRight size={14} />}
              onClick={() => handleStatusAction(q, 'CONVERTED')}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] } }}>
              Convert to Sale
            </Button>
          )}
        </Stack>
      ),
    },
  ], [page]);

  return (
    <Box>
      <PageHeader
        title="Quotations"
        subtitle="Proposals, estimates, and drafts — manage customer negotiations"
        breadcrumbs={[
          { label: 'Sales Desk', href: '/smartpos/sales' },
          { label: 'Quotations' },
        ]}
        action={{
          label: 'New Quotation',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          select size="small" value={status} label="Status"
          onChange={(e) => { setStatus(e.target.value as QuotationStatus | ''); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="SENT">Sent</MenuItem>
          <MenuItem value="ACCEPTED">Accepted</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="CONVERTED">Converted</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No quotations in this view."
        emptyAction={!status ? { label: 'Create first quotation', onClick: () => { setEditing(null); setDrawerOpen(true); } } : undefined}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(q) => q.id}
        onRowClick={(q) => { setEditing(q); setDrawerOpen(true); }}
        enableExport
        exportFileName="quotations"
        toolbarTitle="Quotations"
      />

      <QuotationEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />
    </Box>
  );
}
