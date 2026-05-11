import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem,
  Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  IconEdit, IconPlus, IconTrash, IconAlertTriangle,
} from '@tabler/icons-react';

import {
  listReorderRules, createReorderRule, updateReorderRule, deleteReorderRule,
  type ReorderRule, type ReorderRuleInput,
} from 'src/api/smartpos/reorderRules';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import { listProducts } from 'src/api/smartpos/products';
import type { Product, Supplier } from 'src/api/smartpos/types';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

export default function ReorderRulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── URL-synced state ────────────────────────────────────────────────────
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [warehouseId, setWarehouseId] = useState<string>(searchParams.get('warehouse') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search && search !== '') next.set('search', search); else next.delete('search');
        if (warehouseId && warehouseId !== '') next.set('warehouse', warehouseId); else next.delete('warehouse');
        if (page > 0) next.set('page', String(page)); else next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, warehouseId, page, setSearchParams]);

  // ── Local state ─────────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allRows, setAllRows] = useState<ReorderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReorderRule | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Form state
  const [formProduct, setFormProduct] = useState<Product | null>(null);
  const [formVariantId, setFormVariantId] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formMinQty, setFormMinQty] = useState('');
  const [formReorderQty, setFormReorderQty] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Product search
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productLoading, setProductLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ReorderRule | null>(null);

  // ── Load warehouses & suppliers ─────────────────────────────────────────
  useEffect(() => {
    listWarehouses()
      .then((ws) => {
        setWarehouses(ws);
        if (!warehouseId && ws[0]) setWarehouseId(ws[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listSuppliers({ size: 200 })
      .then((p) => setSuppliers(p.content))
      .catch(() => {});
  }, []);

  // ── Product search (debounced) ──────────────────────────────────────────
  useEffect(() => {
    if (productSearch.length < 2) {
      setProductOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setProductLoading(true);
      try {
        const p = await listProducts({ search: productSearch, size: 20 });
        setProductOptions(p.content);
      } catch {
        setProductOptions([]);
      } finally {
        setProductLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await listReorderRules({ page, size: PAGE_SIZE });
      setAllRows(p.content);
      setTotalPages(p.totalPages || 1);
      setTotalElements(p.totalElements || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Client-side search filter ───────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((r) =>
      r.productId.toLowerCase().includes(q)
      || (r.variantId?.toLowerCase().includes(q))
      || (r.supplierId?.toLowerCase().includes(q)),
    );
  }, [allRows, search]);

  // Also filter by warehouse on client side
  const displayed = useMemo(() => {
    if (!warehouseId) return filtered;
    return filtered.filter((r) => r.warehouseId === warehouseId);
  }, [filtered, warehouseId]);

  // ── Lookup helpers ──────────────────────────────────────────────────────
  const warehouseName = useCallback(
    (id: string) => warehouses.find((w) => w.id === id)?.name ?? id.slice(0, 8),
    [warehouses],
  );
  const supplierName = useCallback(
    (id?: string | null) => {
      if (!id) return '—';
      return suppliers.find((s) => s.id === id)?.name ?? id.slice(0, 8);
    },
    [suppliers],
  );

  // ── Filter chips ────────────────────────────────────────────────────────
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
    return chips;
  }, [warehouseId, warehouses]);

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

  // ── Dialog handlers ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingRule(null);
    setFormProduct(null);
    setFormVariantId('');
    setFormWarehouseId(warehouseId || warehouses[0]?.id || '');
    setFormMinQty('');
    setFormReorderQty('');
    setFormSupplierId('');
    setFormActive(true);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (rule: ReorderRule) => {
    setEditingRule(rule);
    setFormProduct(null); // product lookup by ID is complex — keep blank for edits
    setFormVariantId(rule.variantId ?? '');
    setFormWarehouseId(rule.warehouseId);
    setFormMinQty(String(rule.minQty));
    setFormReorderQty(String(rule.reorderQty));
    setFormSupplierId(rule.supplierId ?? '');
    setFormActive(rule.active);
    setDialogError(null);
    // try to load product for display
    if (rule.productId) {
      setProductSearch(rule.productId.slice(0, 8));
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formProduct && !editingRule) {
      setDialogError('Please select a product.');
      return;
    }
    if (!formWarehouseId) {
      setDialogError('Please select a warehouse.');
      return;
    }
    const min = Number(formMinQty);
    const reorder = Number(formReorderQty);
    if (!min || min <= 0) {
      setDialogError('Minimum quantity must be positive.');
      return;
    }
    if (!reorder || reorder <= 0) {
      setDialogError('Reorder quantity must be positive.');
      return;
    }

    const body: ReorderRuleInput = {
      productId: formProduct?.id ?? editingRule!.productId,
      warehouseId: formWarehouseId,
      minQty: min,
      reorderQty: reorder,
      active: formActive,
    };
    if (formVariantId) body.variantId = formVariantId;
    if (formSupplierId) body.supplierId = formSupplierId;

    setDialogSaving(true);
    setDialogError(null);
    try {
      if (editingRule) {
        await updateReorderRule(editingRule.id, body);
      } else {
        await createReorderRule(body);
      }
      setDialogOpen(false);
      fetchData();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setDialogSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReorderRule(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleteTarget(null);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns: Column<ReorderRule>[] = useMemo(() => [
    {
      key: 'productId', label: 'Product', width: 260, sortable: true,
      render: (r) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {r.productId.slice(0, 8)}…
          </Typography>
          {r.variantId && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}>
              variant {r.variantId.slice(0, 8)}…
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'warehouseId', label: 'Warehouse', width: 160, sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {warehouseName(r.warehouseId)}
        </Typography>
      ),
    },
    {
      key: 'minQty', label: 'Min Qty', align: 'right', width: 100, sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {r.minQty}
        </Typography>
      ),
    },
    {
      key: 'reorderQty', label: 'Reorder Qty', align: 'right', width: 110, sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {r.reorderQty}
        </Typography>
      ),
    },
    {
      key: 'supplierId', label: 'Supplier', width: 160, sortable: true,
      render: (r) => (
        <Typography variant="body2" sx={{ color: r.supplierId ? brand.neutral[800] : brand.neutral[400] }}>
          {supplierName(r.supplierId)}
        </Typography>
      ),
    },
    {
      key: 'active', label: 'Status', align: 'center', width: 90, sortable: true,
      render: (r) => (
        <Chip
          size="small"
          label={r.active ? 'Active' : 'Inactive'}
          sx={{
            height: 22, fontWeight: 700, fontSize: '0.6875rem',
            bgcolor: r.active ? brand.success.light : brand.neutral[200],
            color: r.active ? brand.success.dark : brand.neutral[500],
          }}
        />
      ),
    },
    {
      key: 'actions', label: '', width: 80, align: 'center',
      render: (r) => (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <Tooltip title="Edit rule">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
              <IconEdit size={15} color={brand.neutral[500]} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete rule">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
              <IconTrash size={15} color={brand.error.main} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [warehouseName, supplierName]);

  return (
    <Box>
      <PageHeader
        title="Reorder Rules"
        subtitle="Set minimum stock thresholds and automatic reorder quantities per product"
        action={{ label: 'Add Rule', icon: <IconPlus size={18} />, onClick: openCreate, variant: 'primary' }}
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
        searchAriaLabel="Search reorder rules"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((o) => !o)}
        activeFilters={activeFilters}
        onClearAll={() => { setWarehouseId(''); }}
      >
        <TextField
          select size="small" label="Warehouse"
          value={warehouseId}
          onChange={(e) => { setWarehouseId(e.target.value); setPage(0); }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">— All warehouses —</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
          ))}
        </TextField>
      </FilterBar>

      <DataTable
        tableKey="reorder-rules"
        columns={columns}
        rows={displayed}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        enableSorting
        enableColumnVisibility
        enableExport
        enableExcelExport
        exportFileName="reorder-rules"
        emptyText={!warehouseId ? 'Select a warehouse to view reorder rules.' : 'No reorder rules configured.'}
        toolbarTitle={totalElements > 0 ? `${totalElements} rule${totalElements !== 1 ? 's' : ''}` : undefined}
        getRowKey={(r) => r.id}
        itemLabel="rules"
      />

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => !dialogSaving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
          {editingRule ? 'Edit Reorder Rule' : 'Create Reorder Rule'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialogError && (
              <Alert severity="error" onClose={() => setDialogError(null)}>
                {dialogError}
              </Alert>
            )}

            <Autocomplete
              options={productOptions}
              getOptionLabel={(p) => `${p.name} (${p.code ?? p.id.slice(0, 8)})`}
              value={formProduct}
              onChange={(_, v) => setFormProduct(v)}
              onInputChange={(_, v) => setProductSearch(v)}
              loading={productLoading}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product"
                  required
                  helperText="Search by name or code"
                />
              )}
              disabled={!!editingRule}
            />

            <TextField
              label="Variant ID (optional)"
              value={formVariantId}
              onChange={(e) => setFormVariantId(e.target.value)}
              placeholder="Leave empty for product-level rule"
              helperText="Leave empty for product-level rule"
            />

            <TextField
              select label="Warehouse" required
              value={formWarehouseId}
              onChange={(e) => setFormWarehouseId(e.target.value)}
            >
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Min Qty" required type="number"
                value={formMinQty}
                onChange={(e) => setFormMinQty(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                fullWidth
              />
              <TextField
                label="Reorder Qty" required type="number"
                value={formReorderQty}
                onChange={(e) => setFormReorderQty(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                fullWidth
              />
            </Stack>

            <TextField
              select label="Supplier (optional)"
              value={formSupplierId}
              onChange={(e) => setFormSupplierId(e.target.value)}
            >
              <MenuItem value="">— None —</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
              }
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <IconAlertTriangle size={14} color={formActive ? brand.success.main : brand.neutral[400]} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formActive ? 'Active' : 'Inactive'}
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={dialogSaving} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained" onClick={handleSave} disabled={dialogSaving}
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
              '&:hover': { background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)` },
            }}
          >
            {dialogSaving ? 'Saving…' : editingRule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Reorder Rule</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
            Are you sure you want to delete this reorder rule? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button
            variant="contained" color="error" onClick={handleDelete}
            sx={{ fontWeight: 700 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
