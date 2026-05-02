import { useEffect, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';

import {
  listPayments, type Payment, type PaymentStatus, type PaymentMethod, type ReferenceType,
} from 'src/api/smartpos/payments';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const STATUS_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  PENDING:   { bg: brand.warning.light, fg: brand.warning.dark },
  COMPLETED: { bg: brand.success.light, fg: brand.success.dark },
  FAILED:    { bg: brand.error.light,   fg: brand.error.dark },
  REFUNDED:  { bg: brand.neutral[100],  fg: brand.neutral[700] },
};

const METHOD_TONE: Record<PaymentMethod, string> = {
  CASH:     brand.success.main,
  CARD:     brand.primary[500],
  CHECK:    brand.info.main,
  TRANSFER: brand.accent[500],
  MPESA:    brand.success.dark,
  STRIPE:   brand.primary[700],
};

export default function PaymentsListPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceType, setReferenceType] = useState<ReferenceType | ''>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPayments({
      referenceType: (referenceType || undefined) as ReferenceType | undefined,
      page, size: 20,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [referenceType, page]);

  const columns: Column<Payment>[] = [
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
      key: 'referenceType', label: 'For', align: 'center',
      render: (p) => (
        <Chip label={p.referenceType.replace('_', ' ')} size="small" sx={{
          bgcolor: brand.neutral[100], color: brand.neutral[700], fontWeight: 600,
        }} />
      ),
    },
    {
      key: 'method', label: 'Method', align: 'center',
      render: (p) => (
        <Chip label={p.method} size="small" sx={{
          bgcolor: `${METHOD_TONE[p.method]}15`,
          color: METHOD_TONE[p.method],
          fontWeight: 700,
        }} />
      ),
    },
    {
      key: 'amount', label: 'Amount', align: 'right',
      render: (p) => <span style={{ fontWeight: 700 }}>{fmt(p.amount, p.currency)}</span>,
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (p) => {
        const t = STATUS_TONE[p.status];
        return <Chip label={p.status} size="small" sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
      },
    },
  ];

  return (
    <Box>
      <PageHeader title="Payments" subtitle="All payment transactions across accounts" />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          select size="small" value={referenceType} label="Type"
          onChange={(e) => { setReferenceType(e.target.value as ReferenceType | ''); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="SALE">Sale</MenuItem>
          <MenuItem value="PURCHASE">Purchase</MenuItem>
          <MenuItem value="SALE_RETURN">Sale return</MenuItem>
          <MenuItem value="PURCHASE_RETURN">Purchase return</MenuItem>
          <MenuItem value="EXPENSE">Expense</MenuItem>
          <MenuItem value="DEPOSIT">Deposit</MenuItem>
          <MenuItem value="TRANSFER">Transfer</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No payments recorded yet."
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(p) => p.id}
      />
    </Box>
  );
}
