import { useEffect, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';

import {
  listQuotations, type Quotation, type QuotationStatus,
} from 'src/api/smartpos/sales';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const TONE: Record<QuotationStatus, { bg: string; fg: string }> = {
  DRAFT:     { bg: brand.neutral[100],  fg: brand.neutral[700] },
  SENT:      { bg: brand.info.light,    fg: brand.info.dark },
  ACCEPTED:  { bg: brand.success.light, fg: brand.success.dark },
  REJECTED:  { bg: brand.error.light,   fg: brand.error.dark },
  CONVERTED: { bg: brand.primary[50],   fg: brand.primary[700] },
};

export default function QuotationsListPage() {
  const [rows, setRows] = useState<Quotation[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuotationStatus | ''>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listQuotations({ status: (status || undefined) as QuotationStatus | undefined, page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, page]);

  const columns: Column<Quotation>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (q) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>{q.ref}</Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{new Date(q.date).toLocaleDateString()}</Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (q) => {
        const t = TONE[q.status];
        return <Chip label={q.status} size="small" sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'subtotal', label: 'Subtotal', align: 'right', render: (q) => fmt(q.subtotal) },
    { key: 'taxTotal', label: 'Tax',      align: 'right', render: (q) => fmt(q.taxTotal) },
    { key: 'grandTotal', label: 'Total',  align: 'right', render: (q) => <span style={{ fontWeight: 700 }}>{fmt(q.grandTotal)}</span> },
  ];

  return (
    <Box>
      <PageHeader title="Quotations" subtitle="Proposals, estimates, drafts to convert" />

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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No quotations in this view."
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(q) => q.id}
      />
    </Box>
  );
}
