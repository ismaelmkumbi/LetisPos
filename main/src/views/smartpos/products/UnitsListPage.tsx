import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, InputAdornment,
  MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { IconEdit, IconLayoutList, IconLayoutRows, IconPlus, IconRuler, IconSearch, IconTrash, IconX } from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  listUnits, searchUnits, createUnit, updateUnit, deleteUnit,
  type Unit,
} from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { brand } from 'src/theme/smartpos/brand';

// ── helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): Omit<Unit, 'id'> => ({
  name: '', shortName: '', baseUnitId: null, conversionFactor: 1,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function UnitsListPage() {
  useTranslation('smartpos');

  const [rows, setRows]             = useState<Unit[]>([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dense, setDense]           = useState(true);
  const [sort, setSort]             = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });

  // Full list for base-unit name lookup (fetched once)
  const [allRows, setAllRows] = useState<Unit[]>([]);

  // drawer
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editing, setEditing]           = useState<Unit | null>(null);
  const [form, setForm]                 = useState<Omit<Unit, 'id'>>(emptyForm());
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState<string | null>(null);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── fetch full list for lookups (once) ──────────────────────────────────
  useEffect(() => {
    listUnits().then(setAllRows).catch(() => {});
  }, []);

  // ── fetch paginated ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'name,asc';
      searchUnits({ search: search || undefined, page, size: 20, sort: sortParam })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); setTotalElements(p.totalElements || 0); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, refreshToken, sort]);

  // ── unit name lookup ────────────────────────────────────────────────────
  const unitById = (id: string | null | undefined) =>
    id ? (allRows.find((r) => r.id === id)?.name ?? id) : null;

  // ── drawer helpers ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (u: Unit) => {
    setEditing(u);
    setForm({ name: u.name, shortName: u.shortName, baseUnitId: u.baseUnitId ?? null, conversionFactor: u.conversionFactor });
    setFormError(null);
    setDrawerOpen(true);
  };

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
      setRefreshToken((n) => n + 1);
      setDrawerOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUnit(deleteTarget.id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── columns ────────────────────────────────────────────────────────────
  const columns: Column<Unit>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Unit',
      sortable: true,
      exportValue: (u) => u.name,
      render: (u) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: brand.info.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconRuler size={16} color={brand.info.dark} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.name}</Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{u.shortName}</Typography>
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
        <Chip label={u.shortName} size="small" sx={{
          bgcolor: brand.primary[50], color: brand.primary[700],
          fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px',
        }} />
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
          <Typography variant="body2" sx={{ color: brand.neutral[700] }}>{baseName}</Typography>
        ) : (
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>Base (no parent)</Typography>
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
        <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700] }}>
          ×{u.conversionFactor}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 72,
      enableHiding: false,
      render: (u) => (
        <Stack direction="row" spacing={0.125} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(u); }} sx={{ color: brand.primary[600], p: 0.5 }}>
              <IconEdit size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }} sx={{ color: brand.error.main, p: 0.5 }}>
              <IconTrash size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [allRows]);

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Units of Measure"
        subtitle="Define measurement units and conversion factors"
        badge={totalElements ? { label: `${totalElements.toLocaleString()} units`, tone: 'primary' } : undefined}
        actions={[{
          label: 'New unit',
          icon: <IconPlus size={18} />,
          variant: 'primary',
          onClick: openCreate,
        }]}
      />

      {/* ── Filter bar ── */}
      <Box sx={{
        mb: 2, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`,
        bgcolor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', overflow: 'hidden',
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 1 }}>
          <TextField
            size="small" placeholder="Search units…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{
              flex: 1, maxWidth: 420,
              '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: brand.neutral[50], fontSize: '0.8125rem', '&:hover': { bgcolor: '#fff' }, '&.Mui-focused': { bgcolor: '#fff' } },
              '& .MuiOutlinedInput-input': { py: 0.75 },
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={15} color={brand.neutral[500]} /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearch(''); setPage(0); }} sx={{ p: 0.25 }}>
                    <IconX size={13} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Box sx={{ flex: 1 }} />
          <ToggleButtonGroup size="small" exclusive value={dense ? 'compact' : 'cosy'} onChange={(_, v) => { if (v) setDense(v === 'compact'); }} sx={{
            '& .MuiToggleButton-root': {
              borderRadius: '8px !important', border: `1px solid ${brand.neutral[200]} !important`,
              px: 0.75, py: 0.25, color: brand.neutral[500],
              '&.Mui-selected': { bgcolor: brand.primary[50], color: brand.primary[700], borderColor: `${brand.primary[200]} !important` },
            },
          }}>
            <Tooltip title="Cosy density"><ToggleButton value="cosy"><IconLayoutRows size={14} /></ToggleButton></Tooltip>
            <Tooltip title="Compact density"><ToggleButton value="compact"><IconLayoutList size={14} /></ToggleButton></Tooltip>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No units yet. Create one to get started."
        emptyIcon={<IconRuler size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        getRowKey={(u) => u.id}
        onRowClick={openEdit}
        dense={dense}
        tableKey="units"
        toolbarTitle={totalElements ? `${totalElements.toLocaleString()} ${totalElements === 1 ? 'unit' : 'units'}` : 'Units'}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`units-${new Date().toISOString().slice(0, 10)}`}
      />

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
