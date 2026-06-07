import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert, Avatar, Box, Button, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, IconButton,
  MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  IconBuildingWarehouse, IconMail, IconPhone, IconPlus,
  IconTrash, IconPower, IconMapPin,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  listWarehouses, deleteWarehouse, toggleWarehouseStatus,
  getStockSummary, type Warehouse, type WarehouseSummary,
} from 'src/api/smartpos/inventory';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import { useDynamicBrand } from 'src/theme/smartpos/dynamicBrand';
import { parseApiError } from 'src/utils/smartpos/apiErrors';
import WarehouseEditDrawer from './WarehouseEditDrawer';

export default function WarehousesListPage() {
  const brand = useDynamicBrand();
  const { t } = useTranslation('smartpos');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── URL-synced state ───────────────────────────────────────────────────
  const [search, setSearch]         = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    (searchParams.get('status') as 'all' | 'active' | 'inactive') ?? 'all',
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search && search !== '') next.set('search', search); else next.delete('search');
        if (statusFilter !== 'all') next.set('status', statusFilter); else next.delete('status');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter, setSearchParams]);

  // ── Local state ────────────────────────────────────────────────────────
  const [allRows, setAllRows]     = useState<Warehouse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing]     = useState<Warehouse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [summaries, setSummaries] = useState<Map<string, WarehouseSummary>>(new Map());

  // ── Fetch warehouses ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listWarehouses()
      .then((ws) => { if (!cancelled) setAllRows(ws); })
      .catch((e) => { if (!cancelled) setError(parseApiError(e).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshToken]);

  // ── Fetch stock summaries ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all(allRows.map((w) =>
      getStockSummary(w.id).then((s) => [w.id, s] as const).catch(() => null),
    )).then((results) => {
      if (cancelled) return;
      const map = new Map<string, WarehouseSummary>();
      results.forEach((r) => { if (r) map.set(r[0], r[1]); });
      setSummaries(map);
    });
    return () => { cancelled = true; };
  }, [allRows]);

  // ── Filtered & searched rows (client-side since listWarehouses has no pagination) ──
  const filtered = useMemo(() => {
    let rows = allRows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((w) =>
        w.name.toLowerCase().includes(q)
        || (w.code?.toLowerCase().includes(q))
        || (w.city?.toLowerCase().includes(q))
        || (w.country?.toLowerCase().includes(q)));
    }
    if (statusFilter === 'active') rows = rows.filter((w) => w.active);
    if (statusFilter === 'inactive') rows = rows.filter((w) => !w.active);
    return rows;
  }, [allRows, search, statusFilter]);

  // ── Bulk selection ─────────────────────────────────────────────────────
  const sel = useSelection(filtered);

  // ── Bulk delete ────────────────────────────────────────────────────────
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => deleteWarehouse(id)));
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(parseApiError(e).message);
    } finally {
      setBatchDeleting(false);
      setBatchDeleteOpen(false);
    }
  };

  // ── Status toggle ──────────────────────────────────────────────────────
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const handleToggleStatus = useCallback(async (w: Warehouse) => {
    setToggling((prev) => new Set(prev).add(w.id));
    try {
      await toggleWarehouseStatus(w.id, !w.active);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(parseApiError(e).message);
    } finally {
      setToggling((prev) => { const next = new Set(prev); next.delete(w.id); return next; });
    }
  }, []);

  // ── Delete single ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWarehouse(deleteTarget.id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(parseApiError(e).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
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
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setEditing(null);
        setDrawerOpen(true);
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (sel.selectedIdsRef.current.size > 0) sel.clearSelection();
        else if (search) setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search, sel]);

  // ── Filter chips ───────────────────────────────────────────────────────
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status', label: statusFilter === 'active' ? 'Active' : 'Inactive',
        clear: () => setStatusFilter('all'),
      });
    }
    return chips;
  }, [statusFilter]);

  // ── Columns ────────────────────────────────────────────────────────────
  const columns: Column<Warehouse>[] = useMemo(() => [
    sel.selectionColumn(),
    {
      key: 'name', label: t('smartpos:pos.warehouse', 'Warehouse'), width: 240, sortable: true,
      exportValue: (w) => w.name,
      render: (w) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: w.active ? brand.primary[50] : brand.neutral[100],
              color: w.active ? brand.primary[700] : brand.neutral[500],
              width: 36, height: 36,
            }}
          >
            <IconBuildingWarehouse size={18} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>
              {w.name}
            </Typography>
            {w.code && (
              <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                {w.code}
              </Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'location', label: 'Location', width: 180, sortable: true,
      exportValue: (w) => [w.city, w.country].filter(Boolean).join(', '),
      render: (w) => {
        const loc = [w.city, w.country, w.zip].filter(Boolean).join(', ');
        return loc ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconMapPin size={14} color={brand.neutral[400]} />
            <Typography variant="body2" noWrap>{loc}</Typography>
          </Stack>
        ) : <Typography variant="body2" sx={{ color: brand.neutral[400] }}>—</Typography>;
      },
    },
    {
      key: 'contact', label: 'Contact', width: 200,
      exportValue: (w) => [w.email, w.phone].filter(Boolean).join(' / '),
      render: (w) => (
        <Stack spacing={0.25}>
          {w.email && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconMail size={14} color={brand.neutral[500]} />
              <Typography variant="caption" noWrap>{w.email}</Typography>
            </Stack>
          )}
          {w.phone && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconPhone size={14} color={brand.neutral[500]} />
              <Typography variant="caption">{w.phone}</Typography>
            </Stack>
          )}
          {!w.email && !w.phone && (
            <Typography variant="caption" sx={{ color: brand.neutral[400] }}>—</Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'stock', label: 'Stock', align: 'right', width: 100, sortable: false,
      exportValue: (w) => summaries.get(w.id)?.distinctProducts ?? 0,
      render: (w) => {
        const s = summaries.get(w.id);
        return (
          <Stack alignItems="flex-end">
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {s ? `${s.distinctProducts} products` : '—'}
            </Typography>
            {s && s.lowStockLines > 0 && (
              <Typography variant="caption" sx={{ color: brand.error.dark, fontWeight: 600 }}>
                {s.lowStockLines} low
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'active', label: 'Status', align: 'center', width: 100, sortable: true,
      exportValue: (w) => w.active ? 'Active' : 'Inactive',
      render: (w) => (
        <StatusBadge
          label={w.active ? 'Active' : 'Inactive'}
          tone={w.active ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions', label: '', width: 80, enableHiding: false,
      render: (w) => (
        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
          <Tooltip title={w.active ? 'Deactivate' : 'Activate'}>
            <IconButton
              size="small"
              disabled={toggling.has(w.id)}
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(w); }}
              sx={{
                p: 0.5, borderRadius: '8px',
                color: w.active ? brand.warning.dark : brand.success.dark,
                '&:hover': { bgcolor: w.active ? brand.warning.light : brand.success.light },
              }}
            >
              <IconPower size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}
              sx={{
                p: 0.5, borderRadius: '8px', color: brand.neutral[400],
                '&:hover': { color: brand.error.dark, bgcolor: brand.error.light },
              }}
            >
              <IconTrash size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [sel, summaries, toggling, t, brand, handleToggleStatus]);

  return (
    <Box>
      <PageHeader
        title="Warehouses"
        subtitle="Physical stock locations"
        action={{
          label: 'New warehouse',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <FilterBar
        searchPlaceholder="Search warehouses…"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchAriaLabel="Search warehouses"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((o) => !o)}
        activeFilters={activeFilters}
        onClearAll={() => setStatusFilter('all')}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select size="small" label="Status" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>
      </FilterBar>

      <BulkActionBar
        selectedCount={sel.selectedIds.size}
        onClear={sel.clearSelection}
        itemLabel="warehouse"
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<IconPower size={16} />}
          onClick={async () => {
            await Promise.all(
              Array.from(sel.selectedIds).map((id) => toggleWarehouseStatus(id, false)),
            );
            setRefreshToken((n) => n + 1);
            sel.clearSelection();
          }}
          sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: '8px' }}
        >
          Deactivate
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<IconTrash size={16} />}
          onClick={() => setBatchDeleteOpen(true)}
          sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: '8px' }}
        >
          Delete
        </Button>
      </BulkActionBar>

      <DataTable
        tableKey="warehouses"
        columns={columns}
        rows={filtered}
        loading={loading}
        enableSorting
        enableColumnVisibility
        enableExport
        enableExcelExport
        exportFileName="warehouses"
        emptyText="No warehouses yet. Create your first location."
        toolbarTitle={`${filtered.length} warehouse${filtered.length !== 1 ? 's' : ''}`}
        getRowKey={(w) => w.id}
        onRowClick={(w) => navigate(`/smartpos/warehouses/${w.id}`)}
      />

      <WarehouseEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setRefreshToken((n) => n + 1)}
      />

      {/* Batch delete confirmation */}
      <Dialog open={batchDeleteOpen} onClose={() => setBatchDeleteOpen(false)}>
        <DialogTitle>Delete {sel.selectedIds.size} warehouse{sel.selectedIds.size !== 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will deactivate the selected warehouses. Stock data is preserved.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleBatchDelete} color="error" disabled={batchDeleting}>
            {batchDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will deactivate this warehouse. Stock data is preserved.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteSingle} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
