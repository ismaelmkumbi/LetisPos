import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, InputAdornment,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconBuildingStore, IconEdit, IconLayoutList, IconLayoutRows, IconPlus, IconSearch, IconTrash, IconX,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  searchBrands, createBrand, updateBrand, deleteBrand,
  type Brand,
} from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { brand as palette } from 'src/theme/smartpos/brand';

// ── helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): Omit<Brand, 'id'> => ({ name: '', imageUrl: null, description: null });

// ── Component ─────────────────────────────────────────────────────────────────

export default function BrandsListPage() {
  useTranslation('smartpos');

  const [rows, setRows]             = useState<Brand[]>([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dense, setDense]           = useState(true);
  const [sort, setSort]             = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });

  // drawer
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editing, setEditing]           = useState<Brand | null>(null);
  const [form, setForm]                 = useState<Omit<Brand, 'id'>>(emptyForm());
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState<string | null>(null);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── fetch paginated ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'name,asc';
      searchBrands({ search: search || undefined, page, size: 20, sort: sortParam })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); setTotalElements(p.totalElements || 0); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, refreshToken, sort]);

  // ── drawer helpers ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, imageUrl: b.imageUrl ?? null, description: b.description ?? null });
    setFormError(null);
    setDrawerOpen(true);
  };

  const patch = <K extends keyof Omit<Brand, 'id'>>(k: K, v: Omit<Brand, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) { await updateBrand(editing.id, form); }
      else { await createBrand(form); }
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
      await deleteBrand(deleteTarget.id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── columns ────────────────────────────────────────────────────────────
  const columns: Column<Brand>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Brand',
      sortable: true,
      exportValue: (b) => b.name,
      render: (b) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={b.imageUrl ?? undefined} variant="rounded" sx={{
            bgcolor: palette.accent[50], color: palette.accent[700],
            width: 36, height: 36, fontSize: 13, fontWeight: 700, borderRadius: '8px',
          }}>
            {b.imageUrl ? undefined : b.name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.name}</Typography>
        </Stack>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      exportValue: (b) => b.description ?? '',
      render: (b) => (
        <Typography variant="body2" sx={{ color: palette.neutral[600] }} noWrap>
          {b.description ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 72,
      enableHiding: false,
      render: (b) => (
        <Stack direction="row" spacing={0.125} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(b); }} sx={{ color: palette.primary[600], p: 0.5 }}>
              <IconEdit size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); }} sx={{ color: palette.error.main, p: 0.5 }}>
              <IconTrash size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], []);

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Brands"
        subtitle="Manage product manufacturers and brand labels"
        badge={totalElements ? { label: `${totalElements.toLocaleString()} brands`, tone: 'primary' } : undefined}
        actions={[{
          label: 'New brand',
          icon: <IconPlus size={18} />,
          variant: 'primary',
          onClick: openCreate,
        }]}
      />

      {/* ── Filter bar ── */}
      <Box sx={{
        mb: 2, borderRadius: '12px', border: `1px solid ${palette.neutral[200]}`,
        bgcolor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', overflow: 'hidden',
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 1 }}>
          <TextField
            size="small" placeholder="Search brands…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{
              flex: 1, maxWidth: 420,
              '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: palette.neutral[50], fontSize: '0.8125rem', '&:hover': { bgcolor: '#fff' }, '&.Mui-focused': { bgcolor: '#fff' } },
              '& .MuiOutlinedInput-input': { py: 0.75 },
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={15} color={palette.neutral[500]} /></InputAdornment>,
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
              borderRadius: '8px !important', border: `1px solid ${palette.neutral[200]} !important`,
              px: 0.75, py: 0.25, color: palette.neutral[500],
              '&.Mui-selected': { bgcolor: palette.primary[50], color: palette.primary[700], borderColor: `${palette.primary[200]} !important` },
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
        emptyText="No brands yet. Create one to get started."
        emptyIcon={<IconBuildingStore size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        getRowKey={(b) => b.id}
        onRowClick={openEdit}
        dense={dense}
        tableKey="brands"
        toolbarTitle={totalElements ? `${totalElements.toLocaleString()} ${totalElements === 1 ? 'brand' : 'brands'}` : 'Brands'}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`brands-${new Date().toISOString().slice(0, 10)}`}
      />

      <EditDrawer
        open={drawerOpen}
        title={editing ? 'Edit brand' : 'New brand'}
        subtitle={editing ? editing.name : 'Add a manufacturer or brand label'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField label="Name" required fullWidth size="small" value={form.name} onChange={(e) => patch('name', e.target.value)} />
        <TextField label="Logo / Image URL" fullWidth size="small" value={form.imageUrl ?? ''} onChange={(e) => patch('imageUrl', e.target.value || null)} helperText="Paste a logo URL or leave empty" />
        {form.imageUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={form.imageUrl} variant="rounded" sx={{ width: 48, height: 48, bgcolor: palette.neutral[100] }} />
            <Typography variant="caption" sx={{ color: palette.neutral[500] }}>Logo preview</Typography>
          </Box>
        )}
        <TextField label="Description" fullWidth size="small" multiline minRows={2} value={form.description ?? ''} onChange={(e) => patch('description', e.target.value || null)} />
      </EditDrawer>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete brand?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> will be permanently removed. Products assigned to
            this brand will become unbranded.
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
