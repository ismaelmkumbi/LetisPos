import { useEffect, useState } from 'react';
import {
  Alert, Box, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';

import {
  listStockLevels, lowStockAlerts, listWarehouses,
  type StockLevel, type Warehouse,
} from 'src/api/smartpos/inventory';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

export default function StockLevelsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [rows, setRows] = useState<StockLevel[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [onlyLow, setOnlyLow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses()
      .then((ws) => {
        setWarehouses(ws);
        if (!warehouseId && ws[0]) setWarehouseId(ws[0].id);
      })
      .catch(() => {/* silent — we'll show an error on load below */});
  }, [warehouseId]);

  useEffect(() => {
    if (!warehouseId && !onlyLow) return;
    let cancelled = false;
    setLoading(true);
    const load = onlyLow
      ? lowStockAlerts(warehouseId || undefined, page, 20)
      : listStockLevels(warehouseId, page, 20);
    load
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [warehouseId, page, onlyLow]);

  const columns: Column<StockLevel>[] = [
    {
      key: 'productId', label: 'Product',
      render: (s) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {s.productId.slice(0, 8)}
          </Typography>
          {s.variantId && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}>
              variant {s.variantId.slice(0, 8)}
            </Typography>
          )}
        </Stack>
      ),
    },
    { key: 'onHand',   label: 'On hand',   align: 'right', render: (s) => <span style={{ fontWeight: 700 }}>{s.onHand}</span> },
    { key: 'reserved', label: 'Reserved',  align: 'right', render: (s) => s.reserved },
    {
      key: 'available', label: 'Available', align: 'right',
      render: (s) => (
        <span style={{
          fontWeight: 700,
          color: s.available <= s.stockAlertThreshold ? brand.error.dark : brand.success.dark,
        }}>
          {s.available}
        </span>
      ),
    },
    { key: 'stockAlertThreshold', label: 'Threshold', align: 'right', render: (s) => s.stockAlertThreshold },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (s) => {
        const low = s.available <= s.stockAlertThreshold;
        return (
          <Chip
            size="small"
            label={low ? 'Low' : 'OK'}
            sx={{
              bgcolor: low ? brand.error.light : brand.success.light,
              color:   low ? brand.error.dark  : brand.success.dark,
              fontWeight: 700,
            }}
          />
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader title="Stock levels" subtitle="On-hand, reserved, available — per warehouse" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Warehouse" value={warehouseId}
          onChange={(e) => { setWarehouseId(e.target.value); setPage(0); }}
          sx={{ minWidth: 220 }}
        >
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={
            <Switch
              checked={onlyLow}
              onChange={(e) => { setOnlyLow(e.target.checked); setPage(0); }}
              color="primary"
            />
          }
          label="Only low stock"
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText={onlyLow ? 'All products are above their alert threshold.' : 'No stock in this warehouse yet.'}
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(s) => s.id}
      />
    </Box>
  );
}
