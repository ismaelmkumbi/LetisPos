import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  IconPlus,
  IconShoppingCart,
  IconCurrencyDollar,
  IconAlertTriangle,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import {
  listPurchases,
  type Purchase,
  type PurchaseStatus,
  type PaymentStatus,
} from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const STATUS_TONE: Record<PurchaseStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: brand.neutral[100], fg: brand.neutral[700] },
  ORDERED: { bg: brand.info.light, fg: brand.info.dark },
  RECEIVED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light, fg: brand.error.dark },
};

const PAY_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  UNPAID: { bg: brand.error.light, fg: brand.error.dark },
  PARTIAL: { bg: brand.warning.light, fg: brand.warning.dark },
  PAID: { bg: brand.success.light, fg: brand.success.dark },
  REFUNDED: { bg: brand.neutral[100], fg: brand.neutral[700] },
};

export default function PurchasesListPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseStatus | ''>('');
  const [payStatus, setPayStatus] = useState<PaymentStatus | ''>('');
  const [supplierId, setSupplierId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    listSuppliers({ size: 500, active: true })
      .then((p) => setSuppliers(p.content))
      .catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listPurchases({
        search: search || undefined,
        status: (status || undefined) as PurchaseStatus | undefined,
        paymentStatus: (payStatus || undefined) as PaymentStatus | undefined,
        supplierId: supplierId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        size: 20,
        sort: 'date,desc',
      })
        .then((p) => {
          if (!cancelled) {
            setRows(p.content);
            setTotalPages(p.totalPages || 1);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, status, payStatus, supplierId, dateFrom, dateTo, page, user?.tenantId]);

  // Stats from current page
  const stats = useMemo(() => {
    const total = rows.reduce((s, p) => s + p.grandTotal, 0);
    const paid = rows.reduce((s, p) => s + p.paidTotal, 0);
    const due = rows.reduce((s, p) => s + p.dueTotal, 0);
    const received = rows.filter((p) => p.status === 'RECEIVED').length;
    return { total, paid, due, received, count: rows.length };
  }, [rows]);

  const clearAll = () => {
    setStatus('');
    setPayStatus('');
    setSupplierId('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(0);
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (status)
      out.push({
        key: 'status',
        label: `Status: ${status}`,
        clear: () => {
          setStatus('');
          setPage(0);
        },
      });
    if (payStatus)
      out.push({
        key: 'pay',
        label: `Payment: ${payStatus}`,
        clear: () => {
          setPayStatus('');
          setPage(0);
        },
      });
    if (supplierId) {
      const sn = suppliers.find((s) => s.id === supplierId)?.name ?? supplierId.slice(0, 8);
      out.push({
        key: 'supplier',
        label: `Supplier: ${sn}`,
        clear: () => {
          setSupplierId('');
          setPage(0);
        },
      });
    }
    if (dateFrom)
      out.push({
        key: 'from',
        label: `From: ${dateFrom}`,
        clear: () => {
          setDateFrom('');
          setPage(0);
        },
      });
    if (dateTo)
      out.push({
        key: 'to',
        label: `To: ${dateTo}`,
        clear: () => {
          setDateTo('');
          setPage(0);
        },
      });
    return out;
  }, [status, payStatus, supplierId, dateFrom, dateTo, suppliers]);

  const columns: Column<Purchase>[] = [
    {
      key: 'ref',
      label: 'Ref',
      render: (p) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
            {p.ref}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            {new Date(p.date).toLocaleDateString()}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {p.supplierName ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (p) => {
        const t = STATUS_TONE[p.status];
        return (
          <Chip
            label={p.status}
            size="small"
            sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600, borderRadius: '6px' }}
          />
        );
      },
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      align: 'center',
      render: (p) => {
        const t = PAY_TONE[p.paymentStatus];
        return (
          <Chip
            label={p.paymentStatus}
            size="small"
            sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 600, borderRadius: '6px' }}
          />
        );
      },
    },
    {
      key: 'grandTotal',
      label: 'Total',
      align: 'right',
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {fmt(p.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'paidTotal',
      label: 'Paid',
      align: 'right',
      render: (p) => (
        <Typography variant="body2" sx={{ color: brand.success.dark }}>
          {fmt(p.paidTotal)}
        </Typography>
      ),
    },
    {
      key: 'dueTotal',
      label: 'Due',
      align: 'right',
      render: (p) => (
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: p.dueTotal > 0 ? brand.error.dark : brand.neutral[500] }}
        >
          {fmt(p.dueTotal)}
        </Typography>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due date',
      render: (p) => (
        <Typography
          variant="caption"
          sx={{
            color:
              p.dueDate && new Date(p.dueDate) < new Date() && p.dueTotal > 0
                ? brand.error.dark
                : brand.neutral[600],
            fontWeight: p.dueDate && new Date(p.dueDate) < new Date() && p.dueTotal > 0 ? 700 : 400,
          }}
        >
          {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
        </Typography>
      ),
    },
  ];

  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        flex: 1,
        minWidth: 140,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Purchases"
        subtitle="Orders raised with suppliers"
        action={{
          label: 'New purchase',
          icon: <IconPlus size={18} />,
          onClick: () => nav('/smartpos/purchases/new'),
        }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconShoppingCart size={18} color={brand.primary[600]} />}
          label="Total value"
          value={fmt(stats.total)}
          color={brand.primary[600]}
        />
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.success.main} />}
          label="Paid"
          value={fmt(stats.paid)}
          color={brand.success.main}
        />
        <StatCard
          icon={<IconAlertTriangle size={18} color={brand.error.main} />}
          label="Outstanding"
          value={fmt(stats.due)}
          color={brand.error.main}
        />
        <StatCard
          icon={<IconTruckDelivery size={18} color={brand.accent[500]} />}
          label="Received"
          value={`${stats.received}/${stats.count}`}
          color={brand.accent[500]}
        />
      </Stack>

      <FilterBar
        searchPlaceholder="Search by ref…"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        searchAriaLabel="Search purchases"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAll}
      >
        <TextField
          select
          size="small"
          value={status}
          label="Status"
          onChange={(e) => {
            setStatus(e.target.value as PurchaseStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="ORDERED">Ordered</MenuItem>
          <MenuItem value="RECEIVED">Received</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={payStatus}
          label="Payment"
          onChange={(e) => {
            setPayStatus(e.target.value as PaymentStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="UNPAID">Unpaid</MenuItem>
          <MenuItem value="PARTIAL">Partial</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={supplierId}
          label="Supplier"
          onChange={(e) => {
            setSupplierId(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        />
      </FilterBar>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No purchases in this view."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(p) => p.id}
        onRowClick={(p) => nav(`/smartpos/purchases/${p.id}/edit`)}
        tableKey="purchases"
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName="purchases"
        toolbarTitle="Procurement"
      />
    </Box>
  );
}
