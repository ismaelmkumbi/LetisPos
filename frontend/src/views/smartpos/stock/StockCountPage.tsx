import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import {
  IconBuildingWarehouse, IconPlus,
} from '@tabler/icons-react';

import {
  listStockCounts, openStockCount, listWarehouses,
  type StockCountListItem,
} from 'src/api/smartpos/inventory';
import type { UUID } from 'src/api/smartpos/types';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';

import { brand } from 'src/theme/smartpos/brand';

const countStatusTone: Record<string, 'info' | 'success' | 'neutral'> = {
  OPEN: 'info',
  POSTED: 'success',
  CANCELLED: 'neutral',
};

export default function StockCountPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search && search !== '') next.set('search', search); else next.delete('search');
        if (statusFilter) next.set('status', statusFilter); else next.delete('status');
        if (page > 0) next.set('page', String(page)); else next.delete('page');
        return next;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page, setSearchParams]);

  const [allRows, setAllRows] = useState<StockCountListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);

  useEffect(() => {
    listWarehouses().then((ws) => setWarehouses(ws.map((w) => ({ id: w.id, name: w.name })))).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await listStockCounts({ search: search || undefined, page, size: 20 });
      setAllRows(p.content);
      setTotalPages(p.totalPages || 1);
      setTotalElements(p.totalElements || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock counts');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Open count dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState({ warehouseId: '', notes: '' });

  const handleOpen = async () => {
    if (!openForm.warehouseId) {
      setCreateError('Select a warehouse.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await openStockCount({
        warehouseId: openForm.warehouseId,
        notes: openForm.notes || undefined,
      });
      setDialogOpen(false);
      setOpenForm({ warehouseId: '', notes: '' });
      navigate(`/smartpos/stock/counts/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to open count');
    } finally {
      setSubmitting(false);
    }
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (statusFilter) {
      chips.push({ key: 'status', label: statusFilter, clear: () => setStatusFilter('') });
    }
    return chips;
  }, [statusFilter]);

  // Client-side status filter (since API doesn't support it directly)
  const filtered = useMemo(() => {
    if (!statusFilter) return allRows;
    return allRows.filter((c) => c.status === statusFilter);
  }, [allRows, statusFilter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape' && tag === 'INPUT') { (e.target as HTMLInputElement).blur(); setSearch(''); }
        return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setDialogOpen(true); }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { if (search) setSearch(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search]);

  const columns: Column<StockCountListItem>[] = useMemo(() => [
    {
      key: 'ref', label: 'Ref', width: 160, sortable: true,
      render: (c) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {c.ref}
        </Typography>
      ),
    },
    {
      key: 'warehouseName', label: 'Warehouse', width: 200,
      render: (c) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconBuildingWarehouse size={14} color={brand.neutral[400]} />
          <Typography variant="body2" noWrap>{c.warehouseName}</Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center', width: 120, sortable: true,
      render: (c) => (
        <StatusBadge label={c.status} tone={countStatusTone[c.status] ?? 'neutral'} />
      ),
    },
    {
      key: 'date', label: 'Date', width: 120, sortable: true,
      render: (c) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {c.date}
        </Typography>
      ),
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Stock counts"
        subtitle="Physical inventory verification sessions"
        action={{
          label: 'Open count',
          icon: <IconPlus size={18} />,
          onClick: () => setDialogOpen(true),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <FilterBar
        searchPlaceholder="Search by ref…"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchAriaLabel="Search stock counts"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((o) => !o)}
        activeFilters={activeFilters}
        onClearAll={() => setStatusFilter('')}
      >
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="POSTED">Posted</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </FilterBar>

      <DataTable
        tableKey="stock-counts"
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
        exportFileName="stock-counts"
        emptyText="No stock counts yet."
        toolbarTitle={totalElements > 0 ? `${totalElements} count${totalElements !== 1 ? 's' : ''}` : undefined}
        getRowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/smartpos/stock/counts/${c.id}`)}
      />

      {/* Open count dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Open stock count</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              select size="small" label="Warehouse *" value={openForm.warehouseId}
              onChange={(e) => setOpenForm((f) => ({ ...f, warehouseId: e.target.value }))}
              fullWidth
            >
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small" label="Notes" value={openForm.notes}
              onChange={(e) => setOpenForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth multiline minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleOpen}
            disabled={submitting}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, fontWeight: 700 }}
          >
            {submitting ? 'Opening…' : 'Open count'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
