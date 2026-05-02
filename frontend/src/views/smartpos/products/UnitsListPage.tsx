import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton,
  ListItemIcon, Menu, MenuItem,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconCopy, IconDotsVertical, IconEdit, IconEye,
  IconLayoutList, IconLayoutRows, IconPlus, IconRuler, IconTrash,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  listUnits, searchUnits, createUnit, updateUnit, deleteUnit,
  type Unit,
} from 'src/api/smartpos/products';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const emptyForm = (): Omit<Unit, 'id'> => ({
  name: '', shortName: '', baseUnitId: null, conversionFactor: 1,
});

export default function UnitsListPage() {
  useTranslation('smartpos');

  const [rows, setRows] = useState<Unit[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dense, setDense] = useState(false);
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sel = useSelection(rows);

  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: Unit } | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const [allRows, setAllRows] = useState<Unit[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState<Omit<Unit, 'id'>>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listUnits().then(setAllRows).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'name,asc';
      searchUnits({ search: search || undefined, page, size: PAGE_SIZE, sort: sortParam })
        .then((p) => {
          if (!cancelled) {
            setRows(p.content);
            setTotalPages(p.totalPages || 1);
            setTotalElements(p.totalElements || 0);
          }
        })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, refreshToken, sort]);

  const unitById = useCallback(
    (id: string | null | undefined) => (id ? (allRows.find((r) => r.id === id)?.name ?? id) : null),
    [allRows],
  );

  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const duplicateUnit = useCallback(async (u: Unit) => {
    try {
      await createUnit({
        name: `${u.name} (Copy)`,
        shortName: u.shortName ? `${u.shortName}-copy` : 'cpy',
        baseUnitId: u.baseUnitId ?? null,
        conversionFactor: u.conversionFactor,
      });
      listUnits().then(setAllRows).catch(() => {});
      setRefreshToken((n) => n + 1);
      closeRowMenu();
    } catch {
      //
    }
  }, [closeRowMenu]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = useCallback((u: Unit) => {
    setEditing(u);
    setForm({ name: u.name, shortName: u.shortName, baseUnitId: u.baseUnitId ?? null, conversionFactor: u.conversionFactor });
    setFormError(null);
    setDrawerOpen(true);
  }, []);

  const patch = <K extends keyof Omit<Unit, 'id'>>(k: K, v: Omit<Unit, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    if (!form.shortName.trim()) { setFormError('Short name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) { await updateUnit(editing.id, form); }
      else { await createUnit(form); }
      listUnits().then(setAllRows).catch(() => {});
      setRefreshToken((n) => n + 1);
      setDrawerOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => deleteUnit(id)));
      listUnits().then(setAllRows).catch(() => {});
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch delete failed');
    } finally {
      setBatchDeleting(false);
      setBatchDeleteOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUnit(deleteTarget.id);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
      listUnits().then(setAllRows).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const actionBtnSx = {
    p: 0.5, borderRadius: '8px',
    color: brand.neutral[400],
    '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
  };

  const columns: Column<Unit>[] = useMemo(() => [
    sel.selectionColumn(),
    {
      key: '_rowNum',
      label: '#',
      width: 48,
      align: 'center',
      enableHiding: false,
      sortable: false,
      exportValue: () => '',
      render: (_, idx) => (
        <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, color: brand.neutral[500], fontVariantNumeric: 'tabular-nums' }}>
          {page * PAGE_SIZE + idx + 1}
        </Typography>
      ),
    },
    {
      key: 'name',
      label: 'Unit',
      sortable: true,
      exportValue: (u) => u.name,
      render: (u) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '8px', bgcolor: brand.info.light,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: `1px solid ${brand.neutral[200]}`,
          }}>
            <IconRuler size={15} color={brand.info.dark} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }} noWrap>
              {u.name}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }} noWrap>{u.shortName}</Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'shortName',
      label: 'Abbrev.',
      width: 100,
      sortable: true,
      exportValue: (u) => u.shortName,
      render: (u) => (
        <Chip
          label={u.shortName}
          size="small"
          sx={{
            height: 26, bgcolor: brand.primary[50], color: brand.primary[700],
            fontWeight: 700, fontSize: '0.6875rem', borderRadius: '8px',
            border: `1px solid ${brand.primary[200]}`,
          }}
        />
      ),
    },
    {
      key: 'baseUnitId',
      label: 'Base unit',
      sortable: false,
      exportValue: (u) => unitById(u.baseUnitId) ?? '',
      render: (u) => {
        const baseName = unitById(u.baseUnitId);
        return baseName ? (
          <Typography variant="body2" sx={{ color: brand.neutral[700], fontSize: '0.8125rem' }}>{baseName}</Typography>
        ) : (
          <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 600 }}>Base (no parent)</Typography>
        );
      },
    },
    {
      key: 'conversionFactor',
      label: 'Factor',
      align: 'right',
      width: 90,
      sortable: true,
      exportValue: (u) => u.conversionFactor,
      render: (u) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: brand.neutral[800], fontSize: '0.8125rem' }}>
          ×{u.conversionFactor}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 52,
      enableHiding: false,
      exportValue: () => '',
      render: (u) => (
        <Tooltip title="More actions">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setRowMenu({ anchor: e.currentTarget, row: u }); }}
            sx={actionBtnSx}
            aria-haspopup="true"
          >
            <IconDotsVertical size={14} />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [page, sel.selectionColumn, unitById]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) activeFilters.push({ key: 'search', label: `Search: ${search.trim()}`, clear: () => { setSearch(''); setPage(0); } });
  if (dense) activeFilters.push({ key: 'density', label: 'Compact table', clear: () => setDense(false) });

  const clearAll = useCallback(() => {
    setSearch('');
    setDense(false);
    setPage(0);
  }, []);

  return (
    <Box>
      <PageHeader
        title="Units of Measure"
        subtitle="Define measurement units and conversion factors in one place."
        actions={[{
          label: 'New unit',
          icon: <IconPlus size={18} />,
          onClick: openCreate,
        }]}
      />

      <FilterBar
        searchPlaceholder="Search units…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search units"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAll}
      >
        <Typography variant="caption" sx={{ width: '100%', fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Table layout
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={dense ? 'compact' : 'cosy'}
          onChange={(_, v) => { if (v) setDense(v === 'compact'); }}
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: '10px !important', border: `1px solid ${brand.neutral[200]} !important`,
              px: 1.25, py: 0.5, color: brand.neutral[600], fontWeight: 600, textTransform: 'none',
              '&.Mui-selected': { bgcolor: brand.primary[50], color: brand.primary[700], borderColor: `${brand.primary[200]} !important` },
            },
          }}
        >
          <Tooltip title="Comfortable row height"><ToggleButton value="cosy"><IconLayoutRows size={16} style={{ marginRight: 6 }} /> Cosy</ToggleButton></Tooltip>
          <Tooltip title="More rows per screen"><ToggleButton value="compact"><IconLayoutList size={16} style={{ marginRight: 6 }} /> Compact</ToggleButton></Tooltip>
        </ToggleButtonGroup>
      </FilterBar>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="unit">
          <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={14} />} onClick={() => setBatchDeleteOpen(true)} sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Delete
          </Button>
        </BulkActionBar>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No units match these filters."
        emptyIcon={<IconRuler size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        getRowKey={(u) => u.id}
        onRowClick={openEdit}
        dense={dense}
        tableKey="units"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} units` : undefined}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`units-${new Date().toISOString().slice(0, 10)}`}
      />

      <Menu
        anchorEl={rowMenu?.anchor ?? null}
        open={Boolean(rowMenu)}
        onClose={closeRowMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem dense onClick={() => { if (rowMenu) { openEdit(rowMenu.row); closeRowMenu(); } }}>
          <ListItemIcon sx={{ minWidth: 36 }}><IconEye size={18} /></ListItemIcon>
          View details
        </MenuItem>
        <MenuItem dense onClick={() => { if (rowMenu) { openEdit(rowMenu.row); closeRowMenu(); } }}>
          <ListItemIcon sx={{ minWidth: 36 }}><IconEdit size={18} /></ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem dense onClick={() => { if (rowMenu) void duplicateUnit(rowMenu.row); }}>
          <ListItemIcon sx={{ minWidth: 36 }}><IconCopy size={18} /></ListItemIcon>
          Duplicate
        </MenuItem>
        <MenuItem
          dense
          onClick={() => { if (rowMenu) { setDeleteTarget(rowMenu.row); closeRowMenu(); } }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><IconTrash size={18} /></ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      <EditDrawer
        open={drawerOpen}
        title={editing ? 'Edit unit' : 'New unit'}
        subtitle={editing ? editing.name : 'Add a unit of measure'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        {formError && <Alert severity="error">{formError}</Alert>}
        <Stack direction="row" spacing={2}>
          <TextField label="Name" required fullWidth size="small" value={form.name} onChange={(e) => patch('name', e.target.value)} helperText='e.g. "Kilogram"' />
          <TextField label="Abbreviation" required size="small" value={form.shortName} onChange={(e) => patch('shortName', e.target.value)} sx={{ minWidth: 110 }} helperText='e.g. "kg"' />
        </Stack>
        <TextField label="Base unit" select fullWidth size="small" value={form.baseUnitId ?? ''} onChange={(e) => patch('baseUnitId', e.target.value || null)} helperText="Parent unit (e.g. grams is base for kilograms)">
          <MenuItem value="">— None —</MenuItem>
          {allRows.filter((r) => r.id !== editing?.id).map((r) => (
            <MenuItem key={r.id} value={r.id}>{r.name} ({r.shortName})</MenuItem>
          ))}
        </TextField>
        <TextField label="Conversion factor" type="number" fullWidth size="small" value={form.conversionFactor} onChange={(e) => patch('conversionFactor', Number(e.target.value) || 1)} helperText="How many base units equal one of this unit (e.g. 1000 for kg → g)" inputProps={{ min: 0, step: 'any' }} />
      </EditDrawer>

      <Dialog open={batchDeleteOpen} onClose={() => !batchDeleting && setBatchDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete {sel.selectedIds.size} {sel.selectedIds.size === 1 ? 'unit' : 'units'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Products using these units will have no unit assigned.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} disabled={batchDeleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBatchDelete} disabled={batchDeleting}>
            {batchDeleting ? 'Deleting…' : `Delete ${sel.selectedIds.size}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete unit?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> will be permanently removed. Products using this
            unit will have no unit assigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
