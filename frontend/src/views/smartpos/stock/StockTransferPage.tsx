import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import {
  IconArrowRight, IconBuildingWarehouse, IconPlus, IconTrash,
} from '@tabler/icons-react';

import {
  listTransfers, createTransfer, completeTransfer,
  listWarehouses, type Transfer, type TransferLine, type TransferStatus,
} from 'src/api/smartpos/inventory';
import { listProducts, type Product } from 'src/api/smartpos/products';
import type { UUID } from 'src/api/smartpos/types';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';

import { brand } from 'src/theme/smartpos/brand';

const statusTone: Record<TransferStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  DRAFT: 'info',
  IN_TRANSIT: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export default function StockTransferPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | ''>(searchParams.get('status') as TransferStatus | '' ?? '');
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

  const [allRows, setAllRows] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    listWarehouses().then((ws) => setWarehouses(ws.map((w) => ({ id: w.id, name: w.name })))).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: TransferStatus; page?: number; size?: number } = { page, size: 20 };
      if (statusFilter) params.status = statusFilter;
      const p = await listTransfers(params);
      setAllRows(p.content);
      setTotalPages(p.totalPages || 1);
      setTotalElements(p.totalElements || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleComplete = useCallback(async (t: Transfer) => {
    setCompleting((s) => new Set(s).add(t.id));
    try {
      await completeTransfer(t.id);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete transfer');
    } finally {
      setCompleting((s) => { const n = new Set(s); n.delete(t.id); return n; });
    }
  }, [fetchData]);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    fromWarehouseId: '', toWarehouseId: '', date: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [lines, setLines] = useState<TransferLine[]>([]);

  const handleCreate = async () => {
    if (!createForm.fromWarehouseId || !createForm.toWarehouseId || lines.length === 0) {
      setCreateError('Select both warehouses and add at least one line.');
      return;
    }
    if (createForm.fromWarehouseId === createForm.toWarehouseId) {
      setCreateError('Source and destination must be different.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      await createTransfer({
        fromWarehouseId: createForm.fromWarehouseId,
        toWarehouseId: createForm.toWarehouseId,
        date: createForm.date || undefined,
        notes: createForm.notes || undefined,
        lines,
      });
      fetchData();
      setDialogOpen(false);
      setCreateForm({ fromWarehouseId: '', toWarehouseId: '', date: new Date().toISOString().slice(0, 10), notes: '' });
      setLines([]);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    if (!statusFilter) return [];
    return [{ key: 'status', label: statusFilter.replace('_', ' '), clear: () => setStatusFilter('') }];
  }, [statusFilter]);

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

  const wh = useCallback((id: UUID) => warehouses.find((w) => w.id === id)?.name ?? id.slice(0, 8), [warehouses]);

  const columns: Column<Transfer>[] = useMemo(() => [
    {
      key: 'ref', label: 'Ref', width: 140, sortable: true,
      render: (t) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {t.ref}
        </Typography>
      ),
    },
    {
      key: 'date', label: 'Date', width: 120, sortable: true,
      render: (t) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {t.date}
        </Typography>
      ),
    },
    {
      key: 'from', label: 'From', width: 160,
      render: (t) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconBuildingWarehouse size={14} color={brand.neutral[400]} />
          <Typography variant="body2" noWrap>{wh(t.fromWarehouseId)}</Typography>
        </Stack>
      ),
    },
    {
      key: 'to', label: 'To', width: 160,
      render: (t) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconArrowRight size={14} color={brand.neutral[400]} />
          <Typography variant="body2" noWrap>{wh(t.toWarehouseId)}</Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center', width: 120, sortable: true,
      render: (t) => (
        <StatusBadge
          label={t.status.replace('_', ' ')}
          tone={statusTone[t.status]}
        />
      ),
    },
    {
      key: 'lines', label: 'Lines', align: 'right', width: 80,
      render: (t) => (
        <Chip
          size="small" label={t.lines.length}
          sx={{ height: 22, fontWeight: 700, fontSize: '0.6875rem', bgcolor: brand.neutral[100], color: brand.neutral[600] }}
        />
      ),
    },
    {
      key: 'actions', label: '', width: 210, enableHiding: false,
      render: (t) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>

          {t.status === 'DRAFT' && (
            <Tooltip title="Complete transfer">
              <Button
                size="small"
                variant="outlined"
                disabled={completing.has(t.id)}
                onClick={(e) => { e.stopPropagation(); handleComplete(t); }}
                sx={{
                  fontWeight: 600, fontSize: '0.7rem', borderRadius: '8px',
                  color: brand.success.dark, borderColor: brand.success.main,
                  '&:hover': { bgcolor: brand.success.light, borderColor: brand.success.dark },
                }}
              >
                Complete
              </Button>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ], [completing, wh, handleComplete]);

  return (
    <Box>
      <PageHeader
        title="Stock transfers"
        subtitle="Move stock between warehouses"
        action={{
          label: 'New transfer',
          icon: <IconPlus size={18} />,
          onClick: () => setDialogOpen(true),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <FilterBar
        searchPlaceholder="Search by ref…"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchAriaLabel="Search transfers"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((o) => !o)}
        activeFilters={activeFilters}
        onClearAll={() => setStatusFilter('')}
      >
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TransferStatus | ''); setPage(0); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="IN_TRANSIT">In transit</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </FilterBar>

      <DataTable
        tableKey="transfers"
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
        exportFileName="transfers"
        emptyText="No transfers yet."
        toolbarTitle={totalElements > 0 ? `${totalElements} transfer${totalElements !== 1 ? 's' : ''}` : undefined}
        getRowKey={(t) => t.id}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New stock transfer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField
                select size="small" label="From warehouse *" value={createForm.fromWarehouseId}
                onChange={(e) => setCreateForm((f) => ({ ...f, fromWarehouseId: e.target.value }))}
                fullWidth
              >
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="To warehouse *" value={createForm.toWarehouseId}
                onChange={(e) => setCreateForm((f) => ({ ...f, toWarehouseId: e.target.value }))}
                fullWidth
              >
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date" size="small" label="Date" value={createForm.date}
                onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                InputLabelProps={{ shrink: true }} fullWidth
              />
              <TextField
                size="small" label="Notes" value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                fullWidth
              />
            </Stack>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Lines</Typography>
                <Button
                  size="small"
                  startIcon={<IconPlus size={14} />}
                  onClick={() => setLines((l) => [...l, { productId: '', qty: 0 }])}
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                >
                  Add line
                </Button>
              </Stack>
              <Stack spacing={1.5}>
                {lines.map((line, i) => (
                  <TransferLineRow
                    key={i}
                    line={line}
                    onChange={(l) => setLines((ls) => ls.map((x, j) => (j === i ? l : x)))}
                    onRemove={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  />
                ))}
                {lines.length === 0 && (
                  <Typography variant="caption" sx={{ color: brand.neutral[400], textAlign: 'center', py: 2 }}>
                    Add at least one product line to transfer.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, fontWeight: 700 }}
          >
            {submitting ? 'Saving…' : 'Create transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function TransferLineRow({
  line, onChange, onRemove,
}: {
  line: TransferLine;
  onChange: (l: TransferLine) => void;
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
        type="number" size="small" label="Qty"
        value={line.qty}
        onChange={(e) => onChange({ ...line, qty: Number(e.target.value) })}
        sx={{ width: 100 }}
        InputProps={{ inputProps: { min: 1 } }}
      />
      <IconButton size="small" onClick={onRemove} sx={{ color: brand.neutral[400] }}>
        <IconTrash size={16} />
      </IconButton>
    </Stack>
  );
}
