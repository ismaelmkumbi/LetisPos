import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconBoxMultiple,
  IconClock,
  IconPackage,
  IconPlus,
} from '@tabler/icons-react';

import {
  listStockLevels, lowStockAlerts, listWarehouses,
  type StockLevel, type Warehouse,
} from 'src/api/smartpos/inventory';
import {
  listBatches, createBatch, getExpiringBatches,
  type ProductBatch, type CreateBatchInput,
} from 'src/api/smartpos/batches';
import { listProducts } from 'src/api/smartpos/products';
import type { Product } from 'src/api/smartpos/types';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import { brand } from 'src/theme/smartpos/brand';

export default function StockLevelsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── URL-synced state ─────────────────────────────────────────────────────
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [warehouseId, setWarehouseId] = useState<string>(searchParams.get('warehouse') ?? '');
  const [onlyLow, setOnlyLow] = useState(searchParams.get('low') === '1');
  const [batchedOnly, setBatchedOnly] = useState(searchParams.get('batched') === 'true');
  const [expiringDays, setExpiringDays] = useState<number | null>(() => {
    const v = searchParams.get('expiring');
    return v ? Number(v) : null;
  });
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search && search !== '') next.set('search', search); else next.delete('search');
        if (warehouseId && warehouseId !== '') next.set('warehouse', warehouseId); else next.delete('warehouse');
        if (onlyLow) next.set('low', '1'); else next.delete('low');
        if (batchedOnly) next.set('batched', 'true'); else next.delete('batched');
        if (expiringDays !== null) next.set('expiring', String(expiringDays)); else next.delete('expiring');
        if (page > 0) next.set('page', String(page)); else next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, warehouseId, onlyLow, batchedOnly, expiringDays, page, setSearchParams]);

  // ── Local state ──────────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allRows, setAllRows] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // ── Product name lookup cache ────────────────────────────────────────────
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  // ── Expiry filter state ─────────────────────────────────────────────────
  const [expiringProductIds, setExpiringProductIds] = useState<Set<string>>(new Set());
  const [expiringLoading, setExpiringLoading] = useState(false);

  useEffect(() => {
    if (expiringDays === null) {
      setExpiringProductIds(new Set());
      return;
    }
    let cancelled = false;
    setExpiringLoading(true);
    getExpiringBatches({ warehouseId: warehouseId || undefined, withinDays: expiringDays })
      .then((batches) => {
        if (cancelled) return;
        setExpiringProductIds(new Set(batches.content.map((b) => b.productId)));
      })
      .catch(() => {
        if (cancelled) return;
        setExpiringProductIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setExpiringLoading(false);
      });
    return () => { cancelled = true; };
  }, [expiringDays, warehouseId]);

  // Batched-only filter: fetch all batches to find which products have them
  const [batchedProductIds, setBatchedProductIds] = useState<Set<string>>(new Set());
  const [batchedLoading, setBatchedLoading] = useState(false);

  useEffect(() => {
    if (!batchedOnly) {
      setBatchedProductIds(new Set());
      return;
    }
    let cancelled = false;
    setBatchedLoading(true);
    listBatches({ warehouseId: warehouseId || undefined, size: 200 })
      .then((page) => {
        if (cancelled) return;
        setBatchedProductIds(new Set(page.content.map((b) => b.productId)));
      })
      .catch(() => {
        if (cancelled) return;
        setBatchedProductIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setBatchedLoading(false);
      });
    return () => { cancelled = true; };
  }, [batchedOnly, warehouseId]);

  // ── Batch receive dialog state ──────────────────────────────────────────
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveProduct, setReceiveProduct] = useState<Product | null>(null);
  const [receiveProductSearch, setReceiveProductSearch] = useState('');
  const [receiveProductOptions, setReceiveProductOptions] = useState<Product[]>([]);
  const [receiveProductLoading, setReceiveProductLoading] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    qty: '',
  });
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Debounced product search for receive dialog
  useEffect(() => {
    if (!receiveOpen || receiveProductSearch.length < 2) {
      setReceiveProductOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setReceiveProductLoading(true);
      try {
        const p = await listProducts({ search: receiveProductSearch, size: 15 });
        setReceiveProductOptions(p.content);
      } catch {
        setReceiveProductOptions([]);
      } finally {
        setReceiveProductLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [receiveProductSearch, receiveOpen]);

  useEffect(() => {
    listWarehouses()
      .then((ws) => {
        setWarehouses(ws);
        if (!warehouseId && ws[0]) {
          setWarehouseId(ws[0].id);
        }
      })
      .catch(() => {});
  }, [warehouseId]);

  const fetchData = useCallback(async () => {
    if (!warehouseId && !onlyLow) {
      setAllRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = onlyLow
        ? await lowStockAlerts(warehouseId || undefined, page, 20)
        : await listStockLevels(warehouseId, page, 20);
      setAllRows(p.content);
      setTotalPages(p.totalPages || 1);
      setTotalElements(p.totalElements || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [warehouseId, page, onlyLow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch product names for any unseen product IDs in the current page
  useEffect(() => {
    const unseen = allRows
      .map((s) => s.productId)
      .filter((id) => !productNames[id]);
    if (unseen.length === 0) return;
    let cancelled = false;
    // Fetch in bulk — request a large page and filter to the IDs we need
    listProducts({ size: 200 })
      .then((p) => {
        if (cancelled) return;
        setProductNames((prev) => {
          const next = { ...prev };
          for (const product of p.content) {
            next[product.id] = product.name;
          }
          // Also mark unseen IDs with their truncated form so we don't re-fetch
          for (const id of unseen) {
            if (!next[id]) next[id] = id.slice(0, 8) + '…';
          }
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // Only re-fetch when allRows changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows]);

  // ── Client-side search filter ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = allRows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.productId.toLowerCase().includes(q)
        || (productNames[s.productId]?.toLowerCase().includes(q))
        || (s.variantId?.toLowerCase().includes(q)),
      );
    }
    if (expiringDays !== null && expiringProductIds.size > 0) {
      result = result.filter((s) => expiringProductIds.has(s.productId));
    }
    if (batchedOnly && batchedProductIds.size > 0) {
      result = result.filter((s) => batchedProductIds.has(s.productId));
    }
    return result;
  }, [allRows, search, expiringDays, expiringProductIds, batchedOnly, batchedProductIds, productNames]);

  // ── Filter chips ─────────────────────────────────────────────────────────
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (warehouseId && warehouses.length > 0) {
      const w = warehouses.find((wh) => wh.id === warehouseId);
      chips.push({
        key: 'warehouse',
        label: w?.name ?? warehouseId.slice(0, 8),
        clear: () => setWarehouseId(''),
      });
    }
    if (onlyLow) {
      chips.push({
        key: 'low', label: 'Low stock only',
        clear: () => setOnlyLow(false),
      });
    }
    if (expiringDays !== null) {
      const label = expiringDays === 0 ? 'Expired batches' : `Expiring within ${expiringDays} days`;
      chips.push({
        key: 'expiring', label,
        clear: () => setExpiringDays(null),
      });
    }
    return chips;
    if (batchedOnly) {
      chips.push({
        key: 'batched', label: 'Batched products',
        clear: () => setBatchedOnly(false),
      });
    }
    return chips;
  }, [warehouseId, onlyLow, expiringDays, batchedOnly, warehouses]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape' && tag === 'INPUT') {
          (e.target as HTMLInputElement).blur();
          setSearch('');
        }
        return;
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (search) setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search]);

  // ── Expiry colour helper ──────────────────────────────────────────────────
  const getExpiryTone = (expiryDate: string | null | undefined): 'success' | 'warning' | 'error' | 'neutral' => {
    if (!expiryDate) return 'neutral';
    const now = Date.now();
    const exp = new Date(expiryDate).getTime();
    if (exp < now) return 'error';
    const days = (exp - now) / (1000 * 60 * 60 * 24);
    if (days < 30) return 'error';
    if (days < 90) return 'warning';
    return 'success';
  };

  function formatExpiryLabel(expiryDate: string | null | undefined): string {
    if (!expiryDate) return '—';
    const d = new Date(expiryDate);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Batch breakdown (rendered inside an expanded row) ─────────────────────
  function BatchBreakdown({ stock }: { stock: StockLevel }) {
    const [batches, setBatches] = useState<ProductBatch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(true);

    useEffect(() => {
      setLoadingBatches(true);
      listBatches({
        productId: stock.productId,
        warehouseId: stock.warehouseId,
        size: 50,
      })
        .then((p) => setBatches(p.content))
        .catch(() => setBatches([]))
        .finally(() => setLoadingBatches(false));
    }, [stock.productId, stock.warehouseId, stock.variantId]);

    if (loadingBatches) {
      return (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
            Loading batches…
          </Typography>
        </Stack>
      );
    }

    if (batches.length === 0) {
      return (
        <Stack spacing={1} sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
            No batches recorded for this product at this warehouse.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconPlus size={14} />}
            onClick={() => {
              setReceiveOpen(true);
              setReceiveProduct(null);
              setReceiveProductSearch('');
              setReceiveForm({ batchNumber: '', manufacturingDate: '', expiryDate: '', qty: '' });
              setReceiveError(null);
            }}
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              fontSize: '0.75rem',
              borderRadius: '8px',
            }}
          >
            Receive batch
          </Button>
        </Stack>
      );
    }

    return (
      <Table size="small" sx={{ minWidth: 480 }}>
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', color: brand.neutral[500], py: 0.75 } }}>
            <TableCell>Batch #</TableCell>
            <TableCell>Expiry</TableCell>
            <TableCell align="right">On Hand</TableCell>
            <TableCell align="right">Reserved</TableCell>
            <TableCell align="right">Available</TableCell>
            <TableCell align="center">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {batches.map((b) => {
            const tone = getExpiryTone(b.expiryDate);
            return (
              <TableRow
                key={b.id}
                sx={{
                  '& td': { py: 0.6, fontSize: '0.75rem', borderColor: brand.neutral[100] },
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {b.batchNumber}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={formatExpiryLabel(b.expiryDate)}
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      fontSize: '0.625rem',
                      borderRadius: '5px',
                      bgcolor: tone === 'success' ? brand.success.light
                        : tone === 'warning' ? brand.warning.light
                        : tone === 'error' ? brand.error.light
                        : brand.neutral[100],
                      color: tone === 'success' ? brand.success.dark
                        : tone === 'warning' ? brand.warning.dark
                        : tone === 'error' ? brand.error.dark
                        : brand.neutral[500],
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {b.onHand}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {b.reserved}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {b.available}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={b.status === 'ACTIVE' ? 'Active' : b.status === 'EXPIRED' ? 'Expired' : 'Depleted'}
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      fontSize: '0.625rem',
                      borderRadius: '5px',
                      bgcolor: b.status === 'ACTIVE' ? brand.success.light
                        : b.status === 'EXPIRED' ? brand.error.light
                        : brand.neutral[100],
                      color: b.status === 'ACTIVE' ? brand.success.dark
                        : b.status === 'EXPIRED' ? brand.error.dark
                        : brand.neutral[600],
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  const renderExpanded = (stock: StockLevel) => <BatchBreakdown stock={stock} />;

  // ── Receive-batch handler ───────────────────────────────────────────────
  const resetReceiveForm = useCallback(() => {
    setReceiveProduct(null);
    setReceiveProductSearch('');
    setReceiveForm({ batchNumber: '', manufacturingDate: '', expiryDate: '', qty: '' });
    setReceiveError(null);
  }, []);

  const handleReceiveBatch = useCallback(async () => {
    if (!receiveProduct || !warehouseId || !receiveForm.batchNumber.trim() || !receiveForm.qty) return;
    setReceiveSubmitting(true);
    setReceiveError(null);
    try {
      const body: CreateBatchInput = {
        batchNumber: receiveForm.batchNumber.trim(),
        productId: receiveProduct.id,
        warehouseId,
        qty: Number(receiveForm.qty),
      };
      if (receiveForm.manufacturingDate) body.manufacturingDate = receiveForm.manufacturingDate;
      if (receiveForm.expiryDate) body.expiryDate = receiveForm.expiryDate;
      await createBatch(body);
      setReceiveOpen(false);
      resetReceiveForm();
      fetchData();
    } catch (e) {
      setReceiveError(e instanceof Error ? e.message : 'Failed to receive batch');
    } finally {
      setReceiveSubmitting(false);
    }
  }, [receiveProduct, warehouseId, receiveForm, fetchData, resetReceiveForm]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<StockLevel>[] = useMemo(() => [
    {
      key: 'productId', label: 'Product', width: 260, sortable: true,
      render: (s) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {productNames[s.productId] || s.productId.slice(0, 8) + '…'}
          </Typography>
          {s.variantId && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}>
              variant {s.variantId.slice(0, 8)}…
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'onHand', label: 'On hand', align: 'right', width: 100, sortable: true,
      render: (s) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {s.onHand}
        </Typography>
      ),
    },
    {
      key: 'reserved', label: 'Reserved', align: 'right', width: 100, sortable: true,
      render: (s) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {s.reserved}
        </Typography>
      ),
    },
    {
      key: 'available', label: 'Available', align: 'right', width: 100, sortable: true,
      render: (s) => {
        const low = s.available <= s.stockAlertThreshold;
        return (
          <Typography variant="body2" sx={{
            fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: low ? brand.error.dark : brand.success.dark,
          }}>
            {s.available}
          </Typography>
        );
      },
    },
    {
      key: 'stockAlertThreshold', label: 'Alert at', align: 'right', width: 90, sortable: true,
      render: (s) => (
        <Typography variant="body2" sx={{ color: brand.neutral[500], fontVariantNumeric: 'tabular-nums' }}>
          {s.stockAlertThreshold}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center', width: 90, sortable: true,
      render: (s) => {
        const low = s.available <= s.stockAlertThreshold;
        return (
          <Chip
            size="small"
            label={low ? 'Low' : 'OK'}
            sx={{
              height: 22, fontWeight: 700, fontSize: '0.6875rem',
              bgcolor: low ? brand.error.light : brand.success.light,
              color: low ? brand.error.dark : brand.success.dark,
            }}
          />
        );
      },
    },
  ], [productNames]);

  return (
    <Box>
      <PageHeader
        title="Stock levels"
        subtitle="On-hand, reserved, available — per warehouse"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <FilterBar
        searchPlaceholder="Search by product ID…"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchAriaLabel="Search stock"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((o) => !o)}
        activeFilters={activeFilters}
        onClearAll={() => { setWarehouseId(''); setOnlyLow(false); setExpiringDays(null); }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select size="small" label="Warehouse"
            value={warehouseId}
            onChange={(e) => { setWarehouseId(e.target.value); setPage(0); }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">— Any —</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={onlyLow}
                onChange={(e) => { setOnlyLow(e.target.checked); setPage(0); }}
              />
            }
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconAlertTriangle size={14} color={onlyLow ? brand.error.main : brand.neutral[400]} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Low stock only
                </Typography>
              </Stack>
            }
          />
        </Stack>
      </FilterBar>

      {/* ── Filter chips: Batched + Expiry ─────────────────────────────────── */}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 0.5 }}>
        <Chip
          label="Batched products"
          variant={batchedOnly ? 'filled' : 'outlined'}
          color={batchedOnly ? 'info' : 'default'}
          onClick={() => setBatchedOnly(!batchedOnly)}
          icon={batchedOnly ? <IconBoxMultiple size={14} /> : undefined}
          sx={{
            fontWeight: 600, fontSize: '0.75rem', borderRadius: '8px',
            ...(batchedOnly ? { bgcolor: brand.info.main, color: '#fff' }
              : { borderColor: brand.neutral[300], color: brand.neutral[700] }),
          }}
        />
        {batchedLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
        {[
          { days: 7, label: 'Next 7 days' },
          { days: 30, label: 'Next 30 days' },
          { days: 0, label: 'Expired' },
        ].map(({ days, label }) => {
          const selected = expiringDays === days;
          return (
            <Chip
              key={days}
              label={label}
              variant={selected ? 'filled' : 'outlined'}
              color={selected ? 'warning' : 'default'}
              onClick={() => setExpiringDays(selected ? null : days)}
              icon={selected ? <IconClock size={14} /> : undefined}
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '8px',
                ...(selected
                  ? { bgcolor: brand.warning.main, color: '#fff' }
                  : { borderColor: brand.neutral[300], color: brand.neutral[700] }),
              }}
            />
          );
        })}
        {expiringLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
      </Stack>

      <DataTable
        tableKey="stock-levels"
        columns={columns}
        rows={filtered}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        enableSorting
        enableColumnVisibility
        enableExport
        enableExcelExport
        exportFileName="stock-levels"
        emptyText={
          onlyLow
            ? 'All products are above their alert threshold.'
            : !warehouseId
              ? 'Select a warehouse to view stock levels.'
              : 'No stock records in this warehouse.'
        }
        toolbarTitle={!warehouseId ? undefined : totalElements > 0 ? `${totalElements} record${totalElements !== 1 ? 's' : ''}` : undefined}
        getRowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/smartpos/products/${s.productId}`)}
        expandable
        renderExpanded={renderExpanded}
        toolbar={
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconPackage size={14} />}
            disabled={!warehouseId}
            onClick={() => {
              resetReceiveForm();
              setReceiveOpen(true);
            }}
            sx={{
              borderRadius: '8px',
              borderColor: brand.primary[300],
              color: brand.primary[700],
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'none',
              py: 0.25,
              px: 1.25,
              minHeight: 28,
              '&:hover': {
                borderColor: brand.primary[500],
                bgcolor: brand.primary[50],
              },
            }}
          >
            Receive Batch
          </Button>
        }
      />

      {/* ── Receive Batch Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={receiveOpen}
        onClose={() => { if (!receiveSubmitting) { setReceiveOpen(false); resetReceiveForm(); } }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            border: `1px solid ${brand.neutral[200]}`,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', pb: 0.5 }}>
          Receive Batch
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {receiveError && (
              <Alert severity="error" onClose={() => setReceiveError(null)} sx={{ fontSize: '0.8rem' }}>
                {receiveError}
              </Alert>
            )}

            {/* Product autocomplete */}
            <Autocomplete
              value={receiveProduct}
              onChange={(_, v) => setReceiveProduct(v)}
              inputValue={receiveProductSearch}
              onInputChange={(_, v) => setReceiveProductSearch(v)}
              options={receiveProductOptions}
              loading={receiveProductLoading}
              getOptionLabel={(p) => `${p.name} (${p.code ?? p.id.slice(0, 8)}…)`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product"
                  size="small"
                  placeholder="Search by name or code…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {receiveProductLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText="No products found"
              size="small"
            />

            {/* Warehouse (read-only — pre-filled from page filter) */}
            <TextField
              label="Warehouse"
              size="small"
              value={warehouses.find((w) => w.id === warehouseId)?.name ?? warehouseId}
              InputProps={{ readOnly: true }}
              disabled
            />

            <TextField
              label="Batch number"
              size="small"
              value={receiveForm.batchNumber}
              onChange={(e) => setReceiveForm((f) => ({ ...f, batchNumber: e.target.value }))}
              placeholder="e.g. LOT-2025-001"
              required
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Manufacturing date"
                type="date"
                size="small"
                value={receiveForm.manufacturingDate}
                onChange={(e) => setReceiveForm((f) => ({ ...f, manufacturingDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Expiry date"
                type="date"
                size="small"
                value={receiveForm.expiryDate}
                onChange={(e) => setReceiveForm((f) => ({ ...f, expiryDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>

            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={receiveForm.qty}
              onChange={(e) => setReceiveForm((f) => ({ ...f, qty: e.target.value }))}
              inputProps={{ min: 1, step: 1 }}
              placeholder="0"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => { setReceiveOpen(false); resetReceiveForm(); }}
            disabled={receiveSubmitting}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: brand.neutral[600],
              borderRadius: '8px',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!receiveProduct || !receiveForm.batchNumber.trim() || !receiveForm.qty || !warehouseId || receiveSubmitting}
            onClick={handleReceiveBatch}
            startIcon={receiveSubmitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <IconBoxMultiple size={16} />}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '8px',
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
              '&:disabled': { bgcolor: brand.neutral[200], color: brand.neutral[400] },
            }}
          >
            {receiveSubmitting ? 'Saving…' : 'Receive'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
