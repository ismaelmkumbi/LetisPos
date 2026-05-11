import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import {
  listGoodsReceipts, createGoodsReceipt, postGoodsReceipt,
  type GoodsReceipt, type CreateGoodsReceiptLine,
  listWarehouses,
} from 'src/api/smartpos/inventory';
import { listPurchases, getPurchase, type Purchase } from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier, UUID } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: brand.warning.light, fg: brand.warning.dark },
  POSTED: { bg: brand.success.light, fg: brand.success.dark },
};

export default function GoodsReceivedPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<GoodsReceipt[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  // Record Receipt dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [poOptions, setPoOptions] = useState<Purchase[]>([]);
  const [selectedPO, setSelectedPO] = useState<Purchase | null>(null);
  const [poSearchLoading, setPoSearchLoading] = useState(false);
  const [lineQtys, setLineQtys] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listWarehouses().then(setWarehouses).catch(() => {});
    listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGoodsReceipts({ page, size: PAGE_SIZE, sort: 'date,desc' })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, refreshToken]);

  // Debounced PO search
  useEffect(() => {
    if (poSearch.trim().length < 2) { setPoOptions([]); return; }
    const t = setTimeout(() => {
      setPoSearchLoading(true);
      listPurchases({ search: poSearch, size: 10 })
        .then((p) => setPoOptions(p.content))
        .catch(() => setPoOptions([]))
        .finally(() => setPoSearchLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [poSearch]);

  const openCreateDialog = () => {
    setSelectedPO(null);
    setLineQtys({});
    setNotes('');
    setPoSearch('');
    setPoOptions([]);
    setDialogOpen(true);
  };

  const handlePOSelect = useCallback(async (p: Purchase | null) => {
    setSelectedPO(p);
    if (!p) { setLineQtys({}); return; }
    try {
      const full = await getPurchase(p.id);
      const qtys: Record<string, string> = {};
      full.lines.forEach((l) => { qtys[l.id] = String(l.qty); });
      setLineQtys(qtys);
    } catch {
      const qtys: Record<string, string> = {};
      p.lines.forEach((l) => { qtys[l.id] = String(l.qty); });
      setLineQtys(qtys);
    }
  }, []);

  const handleSave = async (postAfter: boolean) => {
    if (!selectedPO) return;
    setSaving(true);
    try {
      const lines: CreateGoodsReceiptLine[] = selectedPO.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        orderedQty: l.qty,
        receivedQty: parseFloat(lineQtys[l.id] || '0') || 0,
        unitCost: l.unitPrice,
      })).filter((ln) => ln.receivedQty > 0);

      if (lines.length === 0) {
        setError('At least one line must have a received quantity > 0');
        setSaving(false);
        return;
      }

      const receipt = await createGoodsReceipt({
        purchaseId: selectedPO.id,
        supplierId: selectedPO.supplierId ?? undefined,
        warehouseId: selectedPO.warehouseId,
        notes: notes || undefined,
        lines,
      });

      if (postAfter) {
        await postGoodsReceipt(receipt.id);
      }

      setDialogOpen(false);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record receipt');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (id: UUID) => {
    try {
      await postGoodsReceipt(id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post receipt');
    }
  };

  // Client-side warehouse filter
  const filteredRows = useMemo(() => {
    if (!warehouseId) return rows;
    return rows.filter((r) => r.warehouseId === warehouseId);
  }, [rows, warehouseId]);

  const columns: Column<GoodsReceipt>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Ref', width: 150,
      render: (g) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
          {g.ref}
        </Typography>
      ),
    },
    {
      key: 'purchaseRef', label: 'Purchase Ref', width: 150,
      render: (g) => (
        <Typography sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem', color: g.purchaseId ? brand.primary[700] : brand.neutral[400] }}>
          {g.purchaseId ? g.purchaseId.slice(0, 8) + '…' : '—'}
        </Typography>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160,
      render: (g) => suppliers.find((s) => s.id === g.supplierId)?.name ?? '—',
    },
    {
      key: 'warehouseId', label: 'Warehouse', width: 140,
      render: (g) => warehouses.find((w) => w.id === g.warehouseId)?.name ?? '—',
    },
    {
      key: 'date', label: 'Date', width: 110,
      render: (g) => new Date(g.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: (g) => {
        const tone = STATUS_TONE[g.status] ?? STATUS_TONE.DRAFT;
        return <Chip label={g.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: tone.bg, color: tone.fg, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'actions', label: '', align: 'right', width: 100, enableHiding: false,
      render: (g) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {g.status === 'DRAFT' && (
            <Button size="small" startIcon={<IconCheck size={14} />}
              onClick={() => handlePost(g.id)}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', color: brand.success.dark }}>
              Post
            </Button>
          )}
        </Stack>
      ),
    },
  ], [page, suppliers, warehouses]);

  return (
    <Box>
      <PageHeader
        title="Goods Received"
        subtitle="Record inventory received against purchase orders"
        actions={[{
          label: 'Record Receipt',
          icon: <IconPlus size={18} />,
          onClick: openCreateDialog,
        }]}
      />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Warehouse" value={warehouseId}
          onChange={(e) => { setWarehouseId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={columns} rows={filteredRows} loading={loading}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(g) => g.id}
        onRowClick={(g) => nav(`/smartpos/purchases/${g.purchaseId}/edit`)}
        emptyText="No goods received in this view"
        enableExport exportFileName="goods-received"
        toolbarTitle="Goods received"
      />

      {/* Record Receipt Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Goods Receipt</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Purchase order picker */}
            <Autocomplete
              options={poOptions}
              loading={poSearchLoading}
              value={selectedPO}
              onChange={(_, v) => handlePOSelect(v)}
              inputValue={poSearch}
              onInputChange={(_, v) => setPoSearch(v)}
              getOptionLabel={(po) => `${po.ref} — ${po.supplierName ?? 'Unknown'} (${new Date(po.date).toLocaleDateString()})`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField {...params} label="Search Purchase Order" size="small"
                  placeholder="Type ref or supplier name..." />
              )}
              renderOption={(props, po) => (
                <li {...props} key={po.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace" }}>
                      {po.ref}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      {po.supplierName ?? 'Unknown supplier'} | {po.lines.length} lines | {new Date(po.date).toLocaleDateString()}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            {/* Auto-filled lines */}
            {selectedPO && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.neutral[600] }}>
                  Product Lines
                </Typography>
                {selectedPO.lines.map((l) => (
                  <Stack key={l.id} direction="row" spacing={2} alignItems="center">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.productName}</Typography>
                      <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                        Ordered: {l.qty} | Unit cost: {l.unitPrice}
                      </Typography>
                    </Box>
                    <TextField
                      type="number" size="small" label="Received Qty"
                      value={lineQtys[l.id] ?? ''}
                      onChange={(e) => setLineQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      sx={{ width: 130 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Stack>
                ))}
              </>
            )}

            {/* Notes */}
            <TextField label="Notes" size="small" multiline rows={2}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this receipt..." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="outlined" onClick={() => handleSave(false)} disabled={saving || !selectedPO}
            sx={{ fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save as Draft'}
          </Button>
          <Button variant="contained" onClick={() => handleSave(true)} disabled={saving || !selectedPO}
            sx={{ fontWeight: 600 }}>
            {saving ? 'Posting…' : 'Save & Post'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
