import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert, Box, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
} from '@tabler/icons-react';

import {
  listStockLevels, lowStockAlerts, listWarehouses,
  type StockLevel, type Warehouse,
} from 'src/api/smartpos/inventory';
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
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search && search !== '') next.set('search', search); else next.delete('search');
        if (warehouseId && warehouseId !== '') next.set('warehouse', warehouseId); else next.delete('warehouse');
        if (onlyLow) next.set('low', '1'); else next.delete('low');
        if (page > 0) next.set('page', String(page)); else next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, warehouseId, onlyLow, page, setSearchParams]);

  // ── Local state ──────────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allRows, setAllRows] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

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

  // ── Client-side search filter ────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((s) =>
      s.productId.toLowerCase().includes(q)
      || (s.variantId?.toLowerCase().includes(q)),
    );
  }, [allRows, search]);

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
    return chips;
  }, [warehouseId, onlyLow, warehouses]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
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

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<StockLevel>[] = useMemo(() => [
    {
      key: 'productId', label: 'Product', width: 260, sortable: true,
      render: (s) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {s.productId.slice(0, 8)}…
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
  ], []);

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
        onClearAll={() => { setWarehouseId(''); setOnlyLow(false); }}
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
      />
    </Box>
  );
}
