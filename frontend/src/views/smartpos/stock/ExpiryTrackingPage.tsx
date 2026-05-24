import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconClock } from '@tabler/icons-react';

import { getExpiringBatches, type ProductBatch } from 'src/api/smartpos/batches';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { listProducts } from 'src/api/smartpos/products';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 25;

export default function ExpiryTrackingPage() {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [withinDays, setWithinDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Load warehouses once on mount
  useEffect(() => {
    listWarehouses().then(ws => {
      setWarehouses(ws);
      setWarehouseId(prev => prev || (ws[0]?.id ?? ''));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch batches with pagination
  const fetchBatches = useCallback((p = 0) => {
    if (!warehouseId) return;
    setLoading(true);
    getExpiringBatches({ warehouseId: warehouseId || undefined, withinDays, page: p, size: PAGE_SIZE })
      .then(pageResult => {
        setBatches(pageResult.content);
        setTotalPages(pageResult.totalPages ?? 1);
        setTotalElements(pageResult.totalElements ?? 0);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [warehouseId, withinDays]);

  useEffect(() => { fetchBatches(page); }, [page, fetchBatches]);

  // Reload when filters change (reset to page 0)
  useEffect(() => { fetchBatches(0); setPage(0); }, [warehouseId, withinDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve product names — single bulk fetch instead of N individual requests
  useEffect(() => {
    const unseen = batches
      .map(b => b.productId)
      .filter((id): id is string => !!id && !productNames[id]);
    if (unseen.length === 0) return;
    let cancelled = false;
    // Single API call loads up to 500 products; caches misses via fallback UUID
    listProducts({ size: 500, sort: 'createdAt,desc' })
      .then(p => {
        if (cancelled) return;
        setProductNames(prev => {
          const next = { ...prev };
          for (const product of p.content) next[product.id] = product.name;
          for (const id of unseen) {
            if (!next[id]) next[id] = id.slice(0, 8) + '…';
          }
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  const urgencyTone = (expiryDate: string): { bg: string; fg: string; label: string } => {
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (days <= 7) return { bg: brand.error.light, fg: brand.error.dark, label: `${days}d` };
    if (days <= 30) return { bg: brand.warning.light, fg: brand.warning.dark, label: `${days}d` };
    return { bg: brand.neutral[100], fg: brand.neutral[600], label: `${days}d` };
  };

  // Metrics based on the current page view — approximate when paginated.
  // For accurate counts a backend summary endpoint is needed, but the page
  // header metric gives the user a directional read.
  const critical = batches.filter(b => {
    if (!b.expiryDate) return false;
    const d = new Date(b.expiryDate).getTime() - Date.now();
    return d < 7 * 86400000;
  }).length;
  const warning = batches.filter(b => {
    if (!b.expiryDate) return false;
    const d = new Date(b.expiryDate).getTime() - Date.now();
    return d >= 7 * 86400000 && d < 30 * 86400000;
  }).length;

  const columns: Column<ProductBatch>[] = useMemo(() => [
    { key: 'batchNumber', label: 'Batch #', render: r => <Typography sx={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: '0.8125rem' }}>{r.batchNumber}</Typography> },
    { key: 'productId', label: 'Product', render: r => <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{productNames[r.productId] || r.productId.slice(0, 8) + '…'}</Typography> },
    { key: 'onHand', label: 'On Hand', align: 'right', render: r => <Typography sx={{ fontWeight: 600 }}>{r.onHand}</Typography> },
    {
      key: 'expiryDate', label: 'Expires',
      render: r => {
        if (!r.expiryDate) return '—';
        const t = urgencyTone(r.expiryDate);
        return (
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{new Date(r.expiryDate).toLocaleDateString('en-GB')}</Typography>
            <Chip label={t.label} size="small" sx={{ height: 20, fontWeight: 700, fontSize: '0.625rem', bgcolor: t.bg, color: t.fg, borderRadius: '6px', width: 'fit-content' }} />
          </Stack>
        );
      },
    },
    { key: 'manufacturingDate', label: 'Mfg Date', render: r => r.manufacturingDate ? new Date(r.manufacturingDate).toLocaleDateString('en-GB') : '—' },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: r => {
        const expired = r.status === 'EXPIRED';
        return <Chip label={r.status} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: expired ? brand.error.light : brand.success.light, color: expired ? brand.error.dark : brand.success.dark, borderRadius: '6px' }} />;
      },
    },
  ], [productNames]);

  return (
    <Box>
      <PageHeader
        title="Expiry Tracking"
        subtitle="Monitor products approaching expiry. Act before stock goes to waste."
        metrics={[
          { label: 'Critical (≤7d)', value: String(critical) },
          { label: 'Warning (≤30d)', value: String(warning) },
          { label: 'Total', value: String(totalElements) },
        ]}
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Warehouse" value={warehouseId} onChange={e => { setWarehouseId(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
          {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Expiring within" value={withinDays} onChange={e => { setWithinDays(Number(e.target.value)); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value={7}>7 days</MenuItem>
          <MenuItem value={30}>30 days</MenuItem>
          <MenuItem value={60}>60 days</MenuItem>
          <MenuItem value={90}>90 days</MenuItem>
        </TextField>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable
        columns={columns}
        rows={batches}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        getRowKey={r => r.id}
        emptyText="No expiring batches found"
        emptyIcon={<IconClock size={32} />}
        enableExport
        exportFileName="expiry-tracking"
        toolbarTitle={totalElements > 0 ? `${totalElements} expiring batches` : undefined}
      />
    </Box>
  );
}
