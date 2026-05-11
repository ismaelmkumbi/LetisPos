import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconArrowBackUp, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  searchPurchaseReturns, completePurchaseReturn,
  type PurchaseReturn,
} from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: brand.warning.light, fg: brand.warning.dark },
  CONFIRMED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.neutral[100], fg: brand.neutral[500] },
};

export default function SupplierReturnsPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<PurchaseReturn[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchPurchaseReturns({
      search: search || undefined,
      status: (status || undefined) as PurchaseReturn['status'] | undefined,
      supplierId: supplierId || undefined,
      page, size: PAGE_SIZE,
    })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, status, supplierId, page, refreshToken]);

  const handleComplete = async (id: string) => {
    try { await completePurchaseReturn(id); setRefreshToken((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Complete failed'); }
  };

  const pendingCount = rows.filter((r) => r.status === 'DRAFT').length;

  const columns: Column<PurchaseReturn>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Return', width: 180,
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: brand.warning.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconArrowBackUp size={16} color={brand.warning.dark} stroke={1.8} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
            {r.ref}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160,
      render: (r) => (r as any).supplierName ?? suppliers.find((s) => s.id === (r as any).supplierId)?.name ?? '—',
    },
    {
      key: 'purchaseId', label: 'Purchase', width: 120,
      render: (r) => (
        <Typography sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem', color: brand.neutral[500] }}>
          {(r as any).purchaseId?.slice(0, 8)}…
        </Typography>
      ),
    },
    { key: 'lines', label: 'Lines', width: 70, align: 'right', render: (r) => r.lines?.length ?? 0 },
    {
      key: 'grandTotal', label: 'Total', width: 120, align: 'right',
      render: (r) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem', color: brand.operational.critical.text }}>
          {fmt(r.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 110, align: 'center',
      render: (r) => {
        const c = STATUS_TONE[r.status as string] ?? STATUS_TONE.DRAFT;
        return <Chip label={r.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: c.bg, color: c.fg, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'date', label: 'Date', width: 110,
      render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'actions', label: '', align: 'right', width: 150, enableHiding: false,
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <DocumentActionsBar documentType="credit-note" referenceType="purchase-return" referenceId={r.id} />
          {r.status === 'DRAFT' && (
            <Button size="small" startIcon={<IconCheck size={14} />}
              onClick={() => handleComplete(r.id)}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: brand.success.dark }}>
              Complete
            </Button>
          )}
        </Stack>
      ),
    },
  ], [page, suppliers]);

  return (
    <Box>
      <PageHeader
        title="Supplier Returns"
        subtitle="Goods returned to suppliers against purchase orders"
        badge={pendingCount > 0 ? { label: `${pendingCount} pending`, tone: 'warning' } : undefined}
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Pending</MenuItem>
          <MenuItem value="CONFIRMED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
        <TextField select size="small" label="Supplier" value={supplierId}
          onChange={(e) => { setSupplierId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(r) => r.id}
        onRowClick={(r) => nav(`/smartpos/purchases/${(r as any).purchaseId}/edit`)}
        emptyText="No supplier returns in this view"
        enableExport exportFileName="supplier-returns"
        toolbarTitle="Supplier returns"
      />
    </Box>
  );
}
