/**
 * Stocky-parity advanced reports — tabs for Warranty, Dead stock,
 * Inventory valuation, and Sales by category/brand.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Box, Card, Chip, CircularProgress, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';

import {
  getDeadStock, getInventoryValuation, getSalesByDimension, getWarrantyReport,
  type DeadStockReport, type InventoryValuationReport, type SalesByDimensionReport, type WarrantyReport,
} from 'src/api/smartpos/reports';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const fmt = formatMoney;

export default function AdvancedReportsPage() {
  const [tab, setTab] = useState<'warranty' | 'dead' | 'val' | 'dim'>('warranty');

  return (
    <>
      <PageHeader
        title="Advanced reports"
        subtitle="Warranty · Dead stock · Inventory valuation · Sales by category / brand"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="warranty" label="Warranty" />
        <Tab value="dead"     label="Dead stock" />
        <Tab value="val"      label="Inventory valuation" />
        <Tab value="dim"      label="Sales by dimension" />
      </Tabs>

      {tab === 'warranty' && <WarrantyTab />}
      {tab === 'dead'     && <DeadStockTab />}
      {tab === 'val'      && <ValuationTab />}
      {tab === 'dim'      && <DimensionTab />}
    </>
  );
}

// ----------------------------------------------------------------

function WarrantyTab() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo]     = useState(todayIso());
  const [data, setData] = useState<WarrantyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWarrantyReport({ dateFrom: from, dateTo: to })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to]);

  // Resolve product names for any products missing them
  useEffect(() => {
    const missing = (data?.rows ?? []).filter(r => !r.productName).map(r => r.productId);
    if (missing.length === 0) return;
    let cancelled = false;
    import('src/api/smartpos/products').then(({ listProducts }) => {
      listProducts({ size: 200 }).then(p => {
        if (cancelled) return;
        setProductNames(prev => {
          const next = { ...prev };
          for (const prod of p.content) next[prod.id] = prod.name;
          for (const id of missing) { if (!next[id]) next[id] = id.slice(0, 8) + '…'; }
          return next;
        });
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [data]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField type="date" label="From" size="small" value={from}
          onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" size="small" value={to}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <CircularProgress size={20} /> : !data ? null : (
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: brand.neutral[50] }}>
                <TableRow>
                  <TableCell>Serial</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Sale ref</TableCell>
                  <TableCell>Warranty start</TableCell>
                  <TableCell>Warranty end</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Days left</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.serialId}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.serialNumber}</TableCell>
                    <TableCell>{r.productName ?? productNames[r.productId] ?? r.productId.slice(0, 8) + '…'}</TableCell>
                    <TableCell>{r.saleRef ?? '—'}</TableCell>
                    <TableCell>{r.warrantyStart ?? '—'}</TableCell>
                    <TableCell>{r.warrantyEnd ?? '—'}</TableCell>
                    <TableCell align="center">
                      <Chip label={r.status} size="small"
                        sx={{
                          bgcolor: r.status === 'ACTIVE' ? brand.success.light : brand.neutral[100],
                          color:   r.status === 'ACTIVE' ? brand.success.dark  : brand.neutral[500],
                          fontWeight: 600,
                        }} />
                    </TableCell>
                    <TableCell align="right">{r.daysRemaining}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ p: 1.5, borderTop: `1px solid ${brand.neutral[200]}` }}>
            <Typography variant="body2"><strong>{data.total}</strong> serial{data.total === 1 ? '' : 's'} in window</Typography>
          </Box>
        </Card>
      )}
    </>
  );
}

// ----------------------------------------------------------------

function DeadStockTab() {
  const [lookback, setLookback] = useState(60);
  const [data, setData] = useState<DeadStockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeadStock({ lookbackDays: lookback })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [lookback]);

  // Resolve product names for any products missing them
  useEffect(() => {
    const missing = (data?.rows ?? []).filter(r => !r.productName).map(r => r.productId);
    if (missing.length === 0) return;
    let cancelled = false;
    import('src/api/smartpos/products').then(({ listProducts }) => {
      listProducts({ size: 200 }).then(p => {
        if (cancelled) return;
        setProductNames(prev => {
          const next = { ...prev };
          for (const prod of p.content) next[prod.id] = prod.name;
          for (const id of missing) { if (!next[id]) next[id] = id.slice(0, 8) + '…'; }
          return next;
        });
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [data]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
        <TextField type="number" label="Lookback days" size="small" sx={{ width: 160 }}
          value={lookback} onChange={(e) => setLookback(Math.max(1, Number(e.target.value)))} />
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          Items with on-hand &gt; 0 and no sales in the last N days
        </Typography>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <CircularProgress size={20} /> : !data ? null : (
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: brand.neutral[50] }}>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">On hand</TableCell>
                  <TableCell align="right">Unit cost</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell>Last sold</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={`${r.productId}-${r.warehouseId}`}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.productCode ?? '—'}</TableCell>
                    <TableCell>{r.productName ?? productNames[r.productId] ?? r.productId.slice(0, 8) + '…'}</TableCell>
                    <TableCell align="right">{r.onHand}</TableCell>
                    <TableCell align="right">{fmt(r.unitCost)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(r.valuationAtCost)}</TableCell>
                    <TableCell>{r.lastSoldDate ?? '—'}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: brand.neutral[50] }}>
                  <TableCell colSpan={4} sx={{ fontWeight: 700 }}>Total dead-stock value</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(data.totalValueAtCost)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </>
  );
}

// ----------------------------------------------------------------

function ValuationTab() {
  const [asOf, setAsOf] = useState(todayIso());
  const [method, setMethod] = useState<'FIFO' | 'AVG' | 'LATEST'>('AVG');
  const [data, setData] = useState<InventoryValuationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInventoryValuation({ asOf, method })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [asOf, method]);

  // Resolve product names for any products missing them
  useEffect(() => {
    const missing = (data?.rows ?? []).filter(r => !r.productName).map(r => r.productId);
    if (missing.length === 0) return;
    let cancelled = false;
    import('src/api/smartpos/products').then(({ listProducts }) => {
      listProducts({ size: 200 }).then(p => {
        if (cancelled) return;
        setProductNames(prev => {
          const next = { ...prev };
          for (const prod of p.content) next[prod.id] = prod.name;
          for (const id of missing) { if (!next[id]) next[id] = id.slice(0, 8) + '…'; }
          return next;
        });
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [data]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField type="date" label="As of" size="small" value={asOf}
          onChange={(e) => setAsOf(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Method" value={method}
          onChange={(e) => setMethod(e.target.value as 'FIFO' | 'AVG' | 'LATEST')}
          sx={{ minWidth: 140 }}>
          {(['AVG','FIFO','LATEST'] as const).map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <CircularProgress size={20} /> : !data ? null : (
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: brand.neutral[50] }}>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">On hand</TableCell>
                  <TableCell align="right">Unit cost ({data.method})</TableCell>
                  <TableCell align="right">Valuation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={`${r.productId}-${r.warehouseId}`}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.productCode ?? '—'}</TableCell>
                    <TableCell>{r.productName ?? productNames[r.productId] ?? r.productId.slice(0, 8) + '…'}</TableCell>
                    <TableCell align="right">{r.onHand}</TableCell>
                    <TableCell align="right">{fmt(r.unitCost)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(r.valuation)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: brand.neutral[50] }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{data.totalQty}</TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(data.totalValuation)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </>
  );
}

// ----------------------------------------------------------------

function DimensionTab() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo]     = useState(todayIso());
  const [dim, setDim]   = useState<'CATEGORY' | 'BRAND'>('CATEGORY');
  const [data, setData] = useState<SalesByDimensionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSalesByDimension({ dateFrom: from, dateTo: to, dimension: dim })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to, dim]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField type="date" label="From" size="small" value={from}
          onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="To" size="small" value={to}
          onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Group by" value={dim}
          onChange={(e) => setDim(e.target.value as 'CATEGORY' | 'BRAND')}
          sx={{ minWidth: 140 }}>
          <MenuItem value="CATEGORY">Category</MenuItem>
          <MenuItem value="BRAND">Brand</MenuItem>
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <CircularProgress size={20} /> : !data ? null : (
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: brand.neutral[50] }}>
                <TableRow>
                  <TableCell>{data.dimension}</TableCell>
                  <TableCell align="right">Lines</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Net</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.buckets.map((b, i) => (
                  <TableRow key={(b.dimensionId ?? 'none') + ':' + i}>
                    <TableCell>{b.dimensionName ?? '— Uncategorised —'}</TableCell>
                    <TableCell align="right">{b.lines}</TableCell>
                    <TableCell align="right">{b.qty}</TableCell>
                    <TableCell align="right">{fmt(b.gross)}</TableCell>
                    <TableCell align="right">{fmt(b.tax)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(b.net)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: brand.neutral[50] }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Totals</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(data.totalGross)}</TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(data.totalNet)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </>
  );
}
