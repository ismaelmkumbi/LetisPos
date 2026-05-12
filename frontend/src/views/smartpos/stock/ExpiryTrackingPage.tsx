import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconClock } from '@tabler/icons-react';

import { getExpiringBatches, type ProductBatch } from 'src/api/smartpos/batches';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

export default function ExpiryTrackingPage() {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [withinDays, setWithinDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses().then(ws => { setWarehouses(ws); if (!warehouseId && ws[0]) setWarehouseId(ws[0].id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!warehouseId) return;
    setLoading(true);
    getExpiringBatches({ warehouseId: warehouseId || undefined, withinDays })
      .then(bs => setBatches(bs))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [warehouseId, withinDays]);

  const urgencyTone = (expiryDate: string): { bg: string; fg: string; label: string } => {
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (days <= 7) return { bg: brand.error.light, fg: brand.error.dark, label: `${days}d` };
    if (days <= 30) return { bg: brand.warning.light, fg: brand.warning.dark, label: `${days}d` };
    return { bg: brand.neutral[100], fg: brand.neutral[600], label: `${days}d` };
  };

  const critical = batches.filter(b => {
    const d = new Date(b.expiryDate!).getTime() - Date.now();
    return d < 7 * 86400000;
  }).length;
  const warning = batches.filter(b => {
    const d = new Date(b.expiryDate!).getTime() - Date.now();
    return d >= 7 * 86400000 && d < 30 * 86400000;
  }).length;

  const columns: Column<ProductBatch>[] = useMemo(() => [
    { key: 'batchNumber', label: 'Batch #', render: r => <Typography sx={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: '0.8125rem' }}>{r.batchNumber}</Typography> },
    { key: 'productId', label: 'Product', render: r => <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', color: brand.neutral[500] }}>{r.productId.slice(0, 8)}&hellip;</Typography> },
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
  ], []);

  return (
    <Box>
      <PageHeader
        title="Expiry Tracking"
        subtitle="Monitor products approaching expiry. Act before stock goes to waste."
        metrics={[
          { label: 'Critical (≤7d)', value: String(critical) },
          { label: 'Warning (≤30d)', value: String(warning) },
          { label: 'Total', value: String(batches.length) },
        ]}
      />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Warehouse" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} sx={{ minWidth: 200 }}>
          {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Expiring within" value={withinDays} onChange={e => setWithinDays(Number(e.target.value))} sx={{ minWidth: 160 }}>
          <MenuItem value={7}>7 days</MenuItem>
          <MenuItem value={30}>30 days</MenuItem>
          <MenuItem value={60}>60 days</MenuItem>
          <MenuItem value={90}>90 days</MenuItem>
        </TextField>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <DataTable columns={columns} rows={batches} loading={loading} page={0} totalPages={1}
        getRowKey={r => r.id} emptyText="No expiring batches found" emptyIcon={<IconClock size={32} />}
        enableExport exportFileName="expiry-tracking"
        toolbarTitle={batches.length > 0 ? `${batches.length} expiring batches` : undefined} />
    </Box>
  );
}
