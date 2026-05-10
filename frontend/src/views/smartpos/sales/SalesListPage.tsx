import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconPlus, IconBolt, IconReceipt, IconCoin, IconPercentage, IconCash, IconReceipt2, IconFileStack } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { listSales, getSaleStats, type Sale, type SaleStatus, type PaymentStatus, type SaleStats } from 'src/api/smartpos/sales';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import BulkGenerateDialog from 'src/components/smartpos/documents/BulkGenerateDialog';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import MetricCard from 'src/components/smartpos/MetricCard';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const SALE_STATUS_TONE: Record<SaleStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: brand.neutral[100], fg: brand.neutral[700] },
  CONFIRMED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light, fg: brand.error.dark },
  RETURNED: { bg: brand.warning.light, fg: brand.warning.dark },
};

const PAY_STATUS_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  UNPAID: { bg: brand.error.light, fg: brand.error.dark },
  PARTIAL: { bg: brand.warning.light, fg: brand.warning.dark },
  PAID: { bg: brand.success.light, fg: brand.success.dark },
  REFUNDED: { bg: brand.neutral[100], fg: brand.neutral[700] },
};

export default function SalesListPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<Sale[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaleStatus | ''>('');
  const [stats, setStats] = useState<SaleStats | null>(null);

  const sel = useSelection(rows);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSales({
      status: (status || undefined) as SaleStatus | undefined,
      page,
      size: 20,
      sort: 'date,desc',
    })
      .then((p) => {
        if (!cancelled) {
          setRows(p.content);
          setTotalPages(p.totalPages || 1);
          setTotalElements(p.totalElements);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  useEffect(() => {
    getSaleStats({}).then(setStats).catch(() => {});
  }, []);

  const columns: Column<Sale>[] = useMemo(() => [
    sel.selectionColumn(),
    {
      key: '_num',
      label: '#',
      width: 52,
      align: 'center' as const,
      sortable: false,
      enableHiding: false,
      render: (_s, i) => (
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
      key: 'ref',
      label: 'Sale',
      width: 200,
      render: (s) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: s.pos ? brand.accent[50] : brand.primary[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconReceipt2
              size={16}
              color={s.pos ? brand.accent[600] : brand.primary[600]}
              stroke={1.8}
            />
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
              {s.ref}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
              {new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'pos',
      label: 'Channel',
      width: 110,
      align: 'center' as const,
      render: (s) => (
        <Chip
          label={s.pos ? 'POS' : 'Office'}
          size="small"
          sx={{
            height: 22,
            fontWeight: 700,
            fontSize: '0.65rem',
            letterSpacing: '0.03em',
            bgcolor: s.pos ? brand.accent[50] : brand.primary[50],
            color: s.pos ? brand.accent[700] : brand.primary[700],
            borderRadius: '6px',
            '.MuiChip-label': { px: 1 },
          }}
        />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 110,
      align: 'center' as const,
      render: (s) => {
        const t = SALE_STATUS_TONE[s.status];
        return (
          <Chip
            label={s.status}
            size="small"
            sx={{
              height: 22,
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.03em',
              bgcolor: t.bg,
              color: t.fg,
              borderRadius: '6px',
              '.MuiChip-label': { px: 1 },
            }}
          />
        );
      },
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      width: 110,
      align: 'center' as const,
      render: (s) => {
        const t = PAY_STATUS_TONE[s.paymentStatus];
        return (
          <Chip
            label={s.paymentStatus}
            size="small"
            sx={{
              height: 22,
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: '0.03em',
              bgcolor: t.bg,
              color: t.fg,
              borderRadius: '6px',
              '.MuiChip-label': { px: 1 },
            }}
          />
        );
      },
    },
    {
      key: 'grandTotal',
      label: 'Total',
      width: 120,
      align: 'right' as const,
      render: (s) => (
        <Typography
          sx={{
            fontWeight: 700,
            fontFamily: "'DM Mono', 'Courier New', monospace",
            fontSize: '0.82rem',
            color: brand.neutral[800],
            letterSpacing: '-0.03em',
          }}
        >
          {fmt(s.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'paidTotal',
      label: 'Paid',
      width: 110,
      align: 'right' as const,
      render: (s) => (
        <Typography
          sx={{
            fontWeight: 600,
            fontFamily: "'DM Mono', 'Courier New', monospace",
            fontSize: '0.78rem',
            color: s.paidTotal > 0 ? brand.success.dark : brand.neutral[400],
            letterSpacing: '-0.03em',
          }}
        >
          {fmt(s.paidTotal)}
        </Typography>
      ),
    },
    {
      key: 'dueTotal',
      label: 'Due',
      width: 110,
      align: 'right' as const,
      render: (s) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
          {s.dueTotal > 0 && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: brand.operational.critical.dot,
                flexShrink: 0,
              }}
            />
          )}
          <Typography
            sx={{
              fontWeight: 700,
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: '0.78rem',
              color: s.dueTotal > 0 ? brand.operational.critical.text : brand.neutral[400],
              letterSpacing: '-0.03em',
            }}
          >
            {fmt(s.dueTotal)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right' as const,
      width: 120,
      enableHiding: false,
      exportValue: () => '',
      render: (s) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <DocumentActionsBar documentType="tax-invoice" referenceType="sale" referenceId={s.id} />
        </Box>
      ),
    },
  ], [page, sel]);

  const selectedIds = Array.from(sel.selectedIds);

  return (
    <Box>
      <PageHeader
        title={t('nav.sales')}
        subtitle="Transaction history — POS + back-office sales"
        breadcrumbs={[
          { label: 'Sales Desk', href: '/smartpos/sales' },
          { label: 'Sales' },
        ]}
        metrics={
          stats
            ? [
                { label: 'Sales', value: stats.count.toLocaleString() },
                { label: 'Revenue', value: fmt(stats.net) },
                { label: 'Tax', value: fmt(stats.tax) },
                { label: 'Due', value: fmt(stats.due) },
              ]
            : undefined
        }
        action={{
          label: t('common.new') + ' ' + t('nav.sales').toLowerCase(),
          icon: <IconPlus size={18} />,
          onClick: () => nav('/smartpos/sales/new'),
        }}
      />

      {/* Metric cards */}
      {stats && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <MetricCard label="Total Sales" value={stats.count.toLocaleString()} icon={<IconReceipt size={16} />} />
          <MetricCard label="Revenue" value={fmt(stats.net)} icon={<IconCash size={16} />} />
          <MetricCard label="Tax Collected" value={fmt(stats.tax)} icon={<IconPercentage size={16} />} />
          <MetricCard
            label="Outstanding"
            value={fmt(stats.due)}
            icon={<IconCoin size={16} />}
            trend={stats.due > 0 ? { direction: 'up', value: fmt(stats.due) } : undefined}
          />
        </Stack>
      )}

      <Box sx={{ mb: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconBolt size={16} />}
          onClick={() => nav('/smartpos/sales/pos')}
          sx={{
            borderColor: brand.primary[500],
            color: brand.primary[600],
            fontWeight: 600,
            '&:hover': { borderColor: brand.primary[600], bgcolor: brand.primary[50] },
          }}
        >
          {t('nav.pos_terminal')}
        </Button>
        <TextField
          select
          size="small"
          value={status}
          label="Status"
          onChange={(e) => {
            setStatus(e.target.value as SaleStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="CONFIRMED">Confirmed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
          <MenuItem value="RETURNED">Returned</MenuItem>
        </TextField>
      </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <BulkActionBar selectedCount={selectedIds.length} onClear={sel.clearSelection} itemLabel="sale">
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconFileStack size={14} />}
            onClick={() => setBulkOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Bulk Generate
          </Button>
        </BulkActionBar>
      )}

      {!loading && rows.length === 0 && !status && (
        <EmptyStateGuide
          title="No sales yet"
          subtitle="Record your first sale to start tracking revenue and customer transactions."
          icon={<IconBolt size={48} />}
          action={{ label: 'Open POS', to: '/smartpos/sales/pos' }}
          onboardingStep="Step 5 of 5"
        />
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No sales in this view."
        emptyAction={status ? undefined : { label: 'Open POS Terminal', onClick: () => nav('/smartpos/sales/pos') }}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
        getRowKey={(s) => s.id}
        onRowClick={(s) => nav(`/smartpos/sales/${s.id}/edit`)}
        enableExport
        enableExcelExport
        exportFileName="sales"
        toolbarTitle="Sales transactions"
      />

      <BulkGenerateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        referenceType="sale"
        referenceIds={selectedIds}
      />
    </Box>
  );
}
