import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconTruckDelivery, IconPackage } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  listGoodsReceived, receivePurchaseLine,
  type GoodsReceived, type GoodsReceivedLine,
} from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import FilterBar from 'src/components/smartpos/FilterBar';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  ORDERED: { bg: brand.warning.light, fg: brand.warning.dark },
  RECEIVED: { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.error.light, fg: brand.error.dark },
};

export default function GoodsReceivedPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<GoodsReceived[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const [receiveTarget, setReceiveTarget] = useState<GoodsReceived | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  useEffect(() => { listSuppliers({ size: 200 }).then((p) => setSuppliers(p.content)).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGoodsReceived({ supplierId: supplierId || undefined, page, size: PAGE_SIZE })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId, page, refreshToken]);

  const openReceive = (g: GoodsReceived) => {
    setReceiveTarget(g);
    const qtys: Record<string, string> = {};
    g.lines.forEach((l) => { qtys[l.id] = String(l.remainingQty); });
    setReceiveQtys(qtys);
  };

  const handleReceive = async () => {
    if (!receiveTarget) return;
    setReceiving(true);
    try {
      for (const line of receiveTarget.lines) {
        const qty = parseFloat(receiveQtys[line.id] || '0');
        if (qty > 0) {
          await receivePurchaseLine(receiveTarget.id, { lineId: line.id, receivedQty: qty });
        }
      }
      setReceiveTarget(null);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Receive failed');
    } finally {
      setReceiving(false);
    }
  };

  const columns: Column<GoodsReceived>[] = useMemo(() => [
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'PO Ref', width: 160,
      render: (g) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
          {g.ref}
        </Typography>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160,
      render: (g) => suppliers.find((s) => s.id === g.supplierId)?.name ?? '—',
    },
    {
      key: 'date', label: 'Date', width: 110,
      render: (g) => new Date(g.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'totalOrderedQty', label: 'Ordered', width: 90, align: 'right',
      render: (g) => <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{g.totalOrderedQty}</Typography>,
    },
    {
      key: 'totalReceivedQty', label: 'Received', width: 90, align: 'right',
      render: (g) => <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: brand.success.dark }}>{g.totalReceivedQty}</Typography>,
    },
    {
      key: 'remaining', label: 'Remaining', width: 90, align: 'right',
      render: (g) => {
        const rem = g.totalOrderedQty - g.totalReceivedQty;
        return (
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: rem > 0 ? brand.warning.dark : brand.neutral[400] }}>
            {rem}
          </Typography>
        );
      },
    },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: (g) => {
        const tone = STATUS_TONE[g.status] ?? STATUS_TONE.ORDERED;
        return <Chip label={g.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: tone.bg, color: tone.fg, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'actions', label: '', align: 'right', width: 100, enableHiding: false,
      render: (g) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Button size="small" startIcon={<IconPackage size={14} />}
            onClick={() => openReceive(g)}
            disabled={g.status === 'CANCELLED' || g.status === 'RECEIVED'}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            Receive
          </Button>
        </Stack>
      ),
    },
  ], [page, suppliers]);

  return (
    <Box>
      <PageHeader title="Goods Received" subtitle="Track received inventory against purchase orders" />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
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
        getRowKey={(g) => g.id}
        onRowClick={(g) => nav(`/smartpos/purchases/${g.id}/edit`)}
        emptyText="No goods received in this view"
        enableExport exportFileName="goods-received"
        toolbarTitle="Goods received"
      />
      <Dialog open={!!receiveTarget} onClose={() => setReceiveTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Receive Items — {receiveTarget?.ref}</DialogTitle>
        <DialogContent>
          {receiveTarget?.lines.map((l: GoodsReceivedLine) => (
            <Stack key={l.id} direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.productName}</Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  Ordered: {l.orderedQty} | Already received: {l.receivedQty} | Remaining: {l.remainingQty}
                </Typography>
              </Box>
              <TextField
                type="number" size="small"
                value={receiveQtys[l.id] ?? ''}
                onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                sx={{ width: 100 }}
                inputProps={{ min: 0, max: l.remainingQty, step: 0.01 }}
              />
            </Stack>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReceiveTarget(null)} disabled={receiving}>Cancel</Button>
          <Button variant="contained" onClick={handleReceive} disabled={receiving}>
            {receiving ? 'Receiving…' : 'Confirm Receive'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
