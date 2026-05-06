import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField,
  Typography,
} from '@mui/material';
import {
  IconPlus, IconTrash,
} from '@tabler/icons-react';

import {
  listAdjustments, createAdjustment,
  listWarehouses, type Adjustment, type AdjustmentLine,
} from 'src/api/smartpos/inventory';
import { listProducts, type Product } from 'src/api/smartpos/products';
import type { UUID } from 'src/api/smartpos/types';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import { brand } from 'src/theme/smartpos/brand';

export default function StockAdjustmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [warehouseFilter, setWarehouseFilter] = useState(searchParams.get('warehouse') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search && search !== '') next.set('search', search); else next.delete('search');
        if (warehouseFilter && warehouseFilter !== '') next.set('warehouse', warehouseFilter); else next.delete('warehouse');
        if (page > 0) next.set('page', String(page)); else next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, warehouseFilter, page, setSearchParams]);

  const [allRows, setAllRows] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  // Filters
  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    listWarehouses().then((ws) => setWarehouses(ws.map((w) => ({ id: w.id, name: w.name })))).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { warehouseId?: UUID; dateFrom?: string; dateTo?: string; page?: number; size?: number } = {
        page, size: 20,
      };
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const p = await listAdjustments(params);
      setAllRows(p.content);
      setTotalPages(p.totalPages || 1);
      setTotalElements(p.totalElements || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  }, [page, warehouseFilter, dateFrom, dateTo, refreshToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Create drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    warehouseId: '', date: new Date().toISOString().slice(0, 10), reason: '', notes: '',
  });
  const [lines, setLines] = useState<AdjustmentLine[]>([]);

  const handleCreate = async () => {
    if (!createForm.warehouseId || lines.length === 0) {
      setCreateError('Select a warehouse and add at least one line.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      await createAdjustment({
        warehouseId: createForm.warehouseId,
        date: createForm.date || undefined,
        reason: createForm.reason || undefined,
        notes: createForm.notes || undefined,
        lines,
      });
      setRefreshToken((n) => n + 1);
      setDrawerOpen(false);
      setCreateForm({ warehouseId: '', date: new Date().toISOString().slice(0, 10), reason: '', notes: '' });
      setLines([]);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter chips
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (warehouseFilter) {
      const w = warehouses.find((wh) => wh.id === warehouseFilter);
      chips.push({ key: 'warehouse', label: w?.name ?? warehouseFilter.slice(0, 8), clear: () => setWarehouseFilter('') });
    }
    if (dateFrom) chips.push({ key: 'dateFrom', label: `From ${dateFrom}`, clear: () => setDateFrom('') });
    if (dateTo) chips.push({ key: 'dateTo', label: `To ${dateTo}`, clear: () => setDateTo('') });
    return chips;
  }, [warehouseFilter, dateFrom, dateTo, warehouses]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape' && tag === 'INPUT') { (e.target as HTMLInputElement).blur(); setSearch(''); }
        return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setDrawerOpen(true); }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { if (search) setSearch(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search]);

  const columns: Column<Adjustment>[] = useMemo(() => [
    {
      key: 'ref', label: 'Ref', width: 140, sortable: true,
      render: (a) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {a.ref}
        </Typography>
      ),
    },
    {
      key: 'date', label: 'Date', width: 120, sortable: true,
      render: (a) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {a.date}
        </Typography>
      ),
    },
    {
      key: 'warehouseId', label: 'Warehouse', width: 180,
      render: (a) => {
        const w = warehouses.find((wh) => wh.id === a.warehouseId);
        return (
          <Typography variant="body2" noWrap>
            {w?.name ?? a.warehouseId.slice(0, 8)}
          </Typography>
        );
      },
    },
    {
      key: 'reason', label: 'Reason', width: 160,
      render: (a) => (
        <Typography variant="body2" noWrap sx={{ color: a.reason ? brand.neutral[700] : brand.neutral[400] }}>
          {a.reason || '—'}
        </Typography>
      ),
    },
    {
      key: 'lines', label: 'Lines', align: 'right', width: 80,
      render: (a) => (
        <Chip
          size="small" label={a.lines.length}
          sx={{ height: 22, fontWeight: 700, fontSize: '0.6875rem', bgcolor: brand.neutral[100], color: brand.neutral[600] }}
        />
      ),
    },
  ], [warehouses]);

  return (
    <Box>
      <PageHeader
        title="Stock adjustments"
        subtitle="Manual corrections to inventory quantities"
        action={{
          label: 'New adjustment',
          icon: <IconPlus size={18} />,
          onClick: () => setDrawerOpen(true),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <FilterBar
        searchPlaceholder="Search by ref…"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchAriaLabel="Search adjustments"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((o) => !o)}
        activeFilters={activeFilters}
        onClearAll={() => { setWarehouseFilter(''); setDateFrom(''); setDateTo(''); }}
      >
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select size="small" label="Warehouse" value={warehouseFilter}
            onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            type="date" size="small" label="From" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            type="date" size="small" label="To" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
        </Stack>
      </FilterBar>

      <DataTable
        tableKey="adjustments"
        columns={columns}
        rows={allRows}
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
        exportFileName="adjustments"
        emptyText="No adjustments yet."
        toolbarTitle={totalElements > 0 ? `${totalElements} adjustment${totalElements !== 1 ? 's' : ''}` : undefined}
        getRowKey={(a) => a.id}
      />

      {/* Create Dialog */}
      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New stock adjustment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              select size="small" label="Warehouse *" value={createForm.warehouseId}
              onChange={(e) => setCreateForm((f) => ({ ...f, warehouseId: e.target.value }))}
              fullWidth
            >
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date" size="small" label="Date" value={createForm.date}
                onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth
              />
              <TextField
                size="small" label="Reason" value={createForm.reason}
                onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
                fullWidth placeholder="e.g. Damaged, expired"
              />
            </Stack>
            <TextField
              size="small" label="Notes" value={createForm.notes}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth multiline minRows={2}
            />

            {/* Lines */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Lines</Typography>
                <Button
                  size="small"
                  startIcon={<IconPlus size={14} />}
                  onClick={() => setLines((l) => [...l, { productId: '', qtyDelta: 0 }])}
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                >
                  Add line
                </Button>
              </Stack>
              <Stack spacing={1.5}>
                {lines.map((line, i) => (
                  <AdjustmentLineRow
                    key={i}
                    line={line}
                    onChange={(l) => setLines((ls) => ls.map((x, j) => (j === i ? l : x)))}
                    onRemove={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  />
                ))}
                {lines.length === 0 && (
                  <Typography variant="caption" sx={{ color: brand.neutral[400], textAlign: 'center', py: 2 }}>
                    Add at least one product line with a quantity change.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDrawerOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, fontWeight: 700 }}
          >
            {submitting ? 'Saving…' : 'Create adjustment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function AdjustmentLineRow({
  line, onChange, onRemove,
}: {
  line: AdjustmentLine;
  onChange: (l: AdjustmentLine) => void;
  onRemove: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (inputValue.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      listProducts({ search: inputValue, size: 10 }).then((p) => {
        if (!cancelled) setProducts(p.content);
      }).catch(() => {});
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [inputValue]);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Autocomplete
        size="small"
        options={products}
        getOptionLabel={(p) => `${p.name} (${p.code})`}
        inputValue={inputValue}
        onInputChange={(_, v) => setInputValue(v)}
        onChange={(_, p) => { if (p) onChange({ ...line, productId: p.id }); }}
        filterOptions={(x) => x}
        renderInput={(params) => <TextField {...params} label="Product" />}
        sx={{ flex: 1, minWidth: 200 }}
      />
      <TextField
        type="number" size="small" label="Qty Δ"
        value={line.qtyDelta}
        onChange={(e) => onChange({ ...line, qtyDelta: Number(e.target.value) })}
        sx={{ width: 100 }}
      />
      <IconButton size="small" onClick={onRemove} sx={{ color: brand.neutral[400] }}>
        <IconTrash size={16} />
      </IconButton>
    </Stack>
  );
}
