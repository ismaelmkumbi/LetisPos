import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconBolt } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { listSales, type Sale, type SaleStatus, type PaymentStatus } from 'src/api/smartpos/sales';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const SALE_STATUS_TONE: Record<SaleStatus, { bg: string; fg: string }> = {
  DRAFT:     { bg: brand.neutral[100],  fg: brand.neutral[700] },
  CONFIRMED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light,   fg: brand.error.dark },
  RETURNED:  { bg: brand.warning.light, fg: brand.warning.dark },
};

const PAY_STATUS_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  UNPAID:   { bg: brand.error.light,   fg: brand.error.dark },
  PARTIAL:  { bg: brand.warning.light, fg: brand.warning.dark },
  PAID:     { bg: brand.success.light, fg: brand.success.dark },
  REFUNDED: { bg: brand.neutral[100],  fg: brand.neutral[700] },
};

export default function SalesListPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<Sale[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaleStatus | ''>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSales({ status: (status || undefined) as SaleStatus | undefined, page, size: 20, sort: 'date,desc' })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, page]);

  const columns: Column<Sale>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (s) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
            {s.ref}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            {new Date(s.date).toLocaleDateString()}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'pos', label: 'Channel', align: 'center',
      render: (s) => (
        <Chip
          label={s.pos ? 'POS' : 'Back-office'}
          size="small"
          sx={{
            bgcolor: s.pos ? brand.accent[50] : brand.primary[50],
            color:   s.pos ? brand.accent[700] : brand.primary[700],
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (s) => {
        const t = SALE_STATUS_TONE[s.status];
        return <Chip label={s.status} size="small" sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
      },
    },
    {
      key: 'paymentStatus', label: 'Payment', align: 'center',
      render: (s) => {
        const t = PAY_STATUS_TONE[s.paymentStatus];
        return <Chip label={s.paymentStatus} size="small" sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'grandTotal', label: 'Total',    align: 'right', render: (s) => <span style={{ fontWeight: 600 }}>{fmt(s.grandTotal)}</span> },
    { key: 'paidTotal',  label: 'Paid',     align: 'right', render: (s) => fmt(s.paidTotal) },
    {
      key: 'dueTotal',   label: 'Due',      align: 'right',
      render: (s) => <span style={{ color: s.dueTotal > 0 ? brand.error.dark : brand.neutral[500], fontWeight: 600 }}>{fmt(s.dueTotal)}</span>,
    },
  ];

  return (
    <Box>
      <PageHeader
        title={t('nav.sales')}
        subtitle={t('nav.sales_group') + ' — POS + back-office'}
        action={{
          label: t('common.new') + ' ' + t('nav.sales').toLowerCase(),
          icon: <IconPlus size={18} />,
          onClick: () => nav('/smartpos/sales/new'),
        }}
      />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button
          variant="outlined" size="small"
          startIcon={<IconBolt size={16} />}
          onClick={() => nav('/smartpos/pos')}
          sx={{
            borderColor: brand.accent[500], color: brand.accent[600], fontWeight: 700,
            '&:hover': { borderColor: brand.accent[600], bgcolor: brand.accent[50] },
          }}
        >
          {t('nav.pos_terminal')}
        </Button>
        <TextField
          select size="small" value={status} label="Status"
          onChange={(e) => { setStatus(e.target.value as SaleStatus | ''); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="CONFIRMED">Confirmed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
          <MenuItem value="RETURNED">Returned</MenuItem>
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No sales in this view."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(s) => s.id}
        onRowClick={(s) => nav(`/smartpos/sales/${s.id}/edit`)}
      />
    </Box>
  );
}
