import { useEffect, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import {
  listPurchases, type Purchase, type PurchaseStatus, type PaymentStatus,
} from 'src/api/smartpos/sales';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const STATUS_TONE: Record<PurchaseStatus, { bg: string; fg: string }> = {
  DRAFT:     { bg: brand.neutral[100],  fg: brand.neutral[700] },
  ORDERED:   { bg: brand.info.light,    fg: brand.info.dark },
  RECEIVED:  { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light,   fg: brand.error.dark },
};

const PAY_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  UNPAID:   { bg: brand.error.light,   fg: brand.error.dark },
  PARTIAL:  { bg: brand.warning.light, fg: brand.warning.dark },
  PAID:     { bg: brand.success.light, fg: brand.success.dark },
  REFUNDED: { bg: brand.neutral[100],  fg: brand.neutral[700] },
};

export default function PurchasesListPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PurchaseStatus | ''>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPurchases({ status: (status || undefined) as PurchaseStatus | undefined, page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, page]);

  const columns: Column<Purchase>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (p) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>{p.ref}</Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{new Date(p.date).toLocaleDateString()}</Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (p) => {
        const t = STATUS_TONE[p.status];
        return <Chip label={p.status} size="small" sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
      },
    },
    {
      key: 'paymentStatus', label: 'Payment', align: 'center',
      render: (p) => {
        const t = PAY_TONE[p.paymentStatus];
        return <Chip label={p.paymentStatus} size="small" sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'grandTotal', label: 'Total', align: 'right', render: (p) => <span style={{ fontWeight: 700 }}>{fmt(p.grandTotal)}</span> },
    { key: 'paidTotal',  label: 'Paid',  align: 'right', render: (p) => fmt(p.paidTotal) },
    {
      key: 'dueTotal', label: 'Due', align: 'right',
      render: (p) => <span style={{ color: p.dueTotal > 0 ? brand.error.dark : brand.neutral[500], fontWeight: 600 }}>{fmt(p.dueTotal)}</span>,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Purchases"
        subtitle="Orders raised with suppliers"
        action={{ label: 'New purchase', icon: <IconPlus size={18} />, onClick: () => nav('/smartpos/purchases/new') }}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          select size="small" value={status} label="Status"
          onChange={(e) => { setStatus(e.target.value as PurchaseStatus | ''); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="ORDERED">Ordered</MenuItem>
          <MenuItem value="RECEIVED">Received</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No purchases in this view."
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(p) => p.id}
        onRowClick={(p) => nav(`/smartpos/purchases/${p.id}/edit`)}
      />
    </Box>
  );
}
