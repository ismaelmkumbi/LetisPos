import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconBookmarks, IconPlus } from '@tabler/icons-react';

import { listBatches, createBatch, type ProductBatch, type CreateBatchInput } from 'src/api/smartpos/batches';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import FilterBar from 'src/components/smartpos/FilterBar';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  ACTIVE: { bg: brand.success.light, fg: brand.success.dark },
  EXPIRED: { bg: brand.error.light, fg: brand.error.dark },
  DEPLETED: { bg: brand.neutral[100], fg: brand.neutral[500] },
};

export default function BatchTrackingPage() {
  const [rows, setRows] = useState<ProductBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBatchInput>({ productId: '', batchNumber: '', qty: 0, manufacturingDate: '', expiryDate: '', warehouseId: '' });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    listWarehouses().then(ws => { setWarehouses(ws); if (!warehouseId && ws[0]) setWarehouseId(ws[0].id); }).catch(() => {});
  }, [warehouseId]);

  useEffect(() => {
    setLoading(true);
    listBatches({ warehouseId: warehouseId || undefined, search: search || undefined, page, size: PAGE_SIZE })
      .then(p => { setRows(p.content); setTotalPages(p.totalPages || 1); setTotalElements(p.totalElements || 0); })
      .catch(e => setError(e instanceof Error ? (e as Error).message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [warehouseId, search, page, refreshToken]);

  const warehouseName = useCallback((id: string) => warehouses.find(w => w.id === id)?.name ?? id.slice(0, 8), [warehouses]);

  const handleCreate = async () => {
    if (!createForm.productId || !createForm.batchNumber || !createForm.warehouseId) return;
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createBatch(createForm);
      setCreateOpen(false);
      setCreateForm({ productId: '', batchNumber: '', qty: 0, manufacturingDate: '', expiryDate: '', warehouseId: warehouseId });
      setRefreshToken(n => n + 1);
    } catch (e: unknown) {
      setCreateError((e as Error)?.message ?? 'Create failed');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const columns: Column<ProductBatch>[] = useMemo(() => [
    { key: 'batchNumber', label: 'Batch #', render: r => <Typography sx={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: '0.8125rem' }}>{r.batchNumber}</Typography> },
    { key: 'productId', label: 'Product', render: r => <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', color: brand.neutral[500] }}>{r.productId.slice(0, 8)}&hellip;</Typography> },
    { key: 'warehouseId', label: 'Warehouse', render: r => warehouseName(r.warehouseId) },
    { key: 'onHand', label: 'On Hand', align: 'right', render: r => <Typography sx={{ fontWeight: 600 }}>{r.onHand}</Typography> },
    { key: 'available', label: 'Available', align: 'right', render: r => <Typography sx={{ fontWeight: 600, color: r.available > 0 ? brand.success.dark : brand.neutral[400] }}>{r.available}</Typography> },
    {
      key: 'expiryDate', label: 'Expiry', width: 110,
      render: r => r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-GB') : '—',
    },
    { key: 'manufacturingDate', label: 'Mfg', width: 100, render: r => r.manufacturingDate ? new Date(r.manufacturingDate).toLocaleDateString('en-GB') : '—' },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: r => {
        const t = STATUS_TONE[r.status] ?? STATUS_TONE.ACTIVE;
        return <Chip label={r.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: t.bg, color: t.fg, borderRadius: '6px' }} />;
      },
    },
  ], [warehouseName]);

  return (
    <Box>
      <PageHeader
        title="Batch / Lot Tracking"
        subtitle="Track inventory by batch and lot numbers for traceability and expiry management."
        metrics={[{ label: 'Total Batches', value: String(totalElements) }]}
        actions={[{ label: 'New Batch', icon: <IconPlus size={18} />, onClick: () => setCreateOpen(true) }]}
      />
      <FilterBar searchPlaceholder="Search by batch number…" searchValue={search} onSearchChange={v => { setSearch(v); setPage(0); }}
        activeFilters={search ? [{ key: 'search', label: `Search: ${search}`, clear: () => { setSearch(''); setPage(0); } }] : []}
        onClearAll={() => { setSearch(''); setPage(0); }}
        filtersOpen={false} onFiltersToggle={() => {}} />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable columns={columns} rows={rows} loading={loading} page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage}
        getRowKey={r => r.id} emptyText="No batches found" emptyIcon={<IconBookmarks size={32} />}
        enableExport exportFileName="batch-tracking"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} batches` : undefined} />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Batch</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField label="Batch Number" required value={createForm.batchNumber} onChange={e => setCreateForm({...createForm, batchNumber: e.target.value})} />
            <TextField label="Product ID" required value={createForm.productId} onChange={e => setCreateForm({...createForm, productId: e.target.value})} helperText="Paste the product UUID" />
            <TextField label="Quantity" type="number" value={createForm.qty || ''} onChange={e => setCreateForm({...createForm, qty: Number(e.target.value)})} />
            <TextField select label="Warehouse" value={createForm.warehouseId || warehouseId} onChange={e => setCreateForm({...createForm, warehouseId: e.target.value})}>
              {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
            <TextField label="Manufacturing Date" type="date" value={createForm.manufacturingDate} onChange={e => setCreateForm({...createForm, manufacturingDate: e.target.value})} InputLabelProps={{ shrink: true }} />
            <TextField label="Expiry Date" type="date" value={createForm.expiryDate} onChange={e => setCreateForm({...createForm, expiryDate: e.target.value})} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createSubmitting}>{createSubmitting ? 'Creating…' : 'Add Batch'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
