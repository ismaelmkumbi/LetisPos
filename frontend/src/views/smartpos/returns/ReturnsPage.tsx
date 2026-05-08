/**
 * Returns index — paginated list of sale returns with filters.
 *
 * The "create return" path still lives inside the Sale detail view: select
 * a sale, then issue a return against it. This page just lists the results.
 */
import { useCallback, type ElementType, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconExternalLink, IconArrowBackUp } from '@tabler/icons-react';
import { Link as RouterLink, useNavigate } from 'react-router';

import {
  listSaleReturns, type SaleReturn, type SaleReturnSearchParams,
} from 'src/api/smartpos/sales';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { listCustomers } from 'src/api/smartpos/customers';
import type { Customer, UUID } from 'src/api/smartpos/types';

import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import OperationalAlert from 'src/components/smartpos/OperationalAlert';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

type Status = NonNullable<SaleReturnSearchParams['status']>;

const STATUS_COLOURS: Record<Status, { bg: string; fg: string }> = {
  PENDING:   { bg: brand.warning.light, fg: brand.warning.dark },
  COMPLETED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

const fmtMoney = formatMoney;
const PAGE_SIZE = 20;

export default function ReturnsPage() {
  const nav = useNavigate();
  const [rows, setRows]     = useState<SaleReturn[]>([]);
  const [page, setPage]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [customerId, setCustomerId] = useState<UUID | ''>('');
  const [warehouseId, setWarehouseId] = useState<UUID | ''>('');

  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Fraud detection: flag customers with >3 returns in visible data
  const fraudCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      if (r.customerId) counts.set(r.customerId, (counts.get(r.customerId) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([, c]) => c > 3)
      .map(([id, c]) => ({ id, count: c, name: customers.find((c) => c.id === id)?.name ?? id.slice(0, 8) + '…' }));
  }, [rows, customers]);

  const pendingCount = useMemo(() => rows.filter((r) => (r.status as string) === 'PENDING').length, [rows]);

  // Bootstrap filter dropdowns once.
  useEffect(() => {
    listWarehouses().then(setWarehouses).catch(() => {});
    listCustomers({ size: 200 }).then((p) => setCustomers(p.content)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSaleReturns({
      from: from || undefined,
      to:   to   || undefined,
      status: status || undefined,
      customerId:  (customerId  || undefined) as UUID | undefined,
      warehouseId: (warehouseId || undefined) as UUID | undefined,
      page, size: 20,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load returns'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to, status, customerId, warehouseId, page]);

  const customerName = useCallback((id: UUID | null) =>
    id ? (customers.find((c) => c.id === id)?.name ?? id.slice(0, 8) + '…') : '—',
  [customers]);
  const warehouseName = useCallback((id: UUID) =>
    warehouses.find((w) => w.id === id)?.name ?? id.slice(0, 8) + '…',
  [warehouses]);

  const cols: Column<SaleReturn>[] = useMemo(() => [
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
      key: 'ref', label: 'Return', width: 200,
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '10px',
              bgcolor: brand.warning.light,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconArrowBackUp size={16} color={brand.warning.dark} stroke={1.8} />
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
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
              {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'sale', label: 'Original sale',
      render: (r) => (
        <Button
          component={RouterLink as ElementType}
          to={`/smartpos/sales/${r.saleId}/edit`}
          size="small"
          variant="text"
          endIcon={<IconExternalLink size={14} />}
          sx={{ textTransform: 'none', color: brand.primary[700], fontWeight: 600, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem' }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {r.saleId.slice(0, 8)}…
        </Button>
      ),
    },
    { key: 'customer', label: 'Customer', render: (r) => customerName(r.customerId) },
    { key: 'warehouse', label: 'Warehouse', render: (r) => warehouseName(r.warehouseId) },
    {
      key: 'lines', label: 'Lines', width: 70, align: 'right' as const,
      render: (r) => (
        <Typography sx={{ fontWeight: 600, color: brand.neutral[600], fontSize: '0.8125rem' }}>
          {r.lines?.length ?? 0}
        </Typography>
      ),
    },
    {
      key: 'grandTotal', label: 'Refund', width: 120, align: 'right' as const,
      render: (r) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem', color: brand.operational.critical.text, letterSpacing: '-0.03em' }}>
          {fmtMoney(r.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 110, align: 'center' as const,
      render: (r) => {
        const c = STATUS_COLOURS[r.status as Status] ?? STATUS_COLOURS.PENDING;
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
  ], [page, customerName, warehouseName]);

  return (
    <Box>
      <PageHeader
        title="Returns"
        subtitle="Refunds and returned goods against past sales"
        breadcrumbs={[
          { label: 'Sales Desk', href: '/smartpos/sales' },
          { label: 'Returns' },
        ]}
        badge={pendingCount > 0 ? { label: `${pendingCount} pending`, tone: 'warning' } : undefined}
      />

      {/* Fraud alerts */}
      {fraudCounts.length > 0 && fraudCounts.map((f) => (
        <OperationalAlert
          key={f.id}
          context="fraud"
          title={`High return frequency: ${f.name}`}
          message={`${f.count} returns in the current view. Review for potential abuse.`}
          count={f.count}
        />
      ))}

      {!customerId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1 }}>
          New returns are issued from a sale's detail view. Open <strong>Sales →</strong> a row → <strong>Issue return</strong>.
        </Alert>
      )}

      {/* Filter bar */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField type="date" size="small" label="From" value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label="To" value={to}
          onChange={(e) => { setTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as Status | ''); setPage(0); }}
          sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
        <TextField select size="small" label="Customer" value={customerId}
          onChange={(e) => { setCustomerId(e.target.value as UUID | ''); setPage(0); }}
          sx={{ minWidth: 200 }}>
          <MenuItem value="">All customers</MenuItem>
          {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Warehouse" value={warehouseId}
          onChange={(e) => { setWarehouseId(e.target.value as UUID | ''); setPage(0); }}
          sx={{ minWidth: 200 }}>
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
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
        getRowKey={(r) => r.id}
        onRowClick={(r) => nav(`/smartpos/sales/${r.saleId}/edit`)}
        emptyText="No returns yet for this filter."
        enableExport
        exportFileName="returns"
        toolbarTitle="Returns & refunds"
      />
    </Box>
  );
}
