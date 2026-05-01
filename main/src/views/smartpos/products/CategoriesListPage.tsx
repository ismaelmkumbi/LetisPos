import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, InputAdornment,
  MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconEdit, IconLayoutList, IconLayoutRows, IconPlus, IconSearch, IconTag, IconTrash, IconX,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  listCategories, searchCategories, createCategory, updateCategory, deleteCategory,
  type Category,
} from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { brand } from 'src/theme/smartpos/brand';

// ── helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): Omit<Category, 'id'> => ({
  name: '', code: '', parentId: null, imageUrl: null, description: null,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function CategoriesListPage() {
  useTranslation('smartpos');

  const [rows, setRows]             = useState<Category[]>([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dense, setDense]           = useState(true);
  const [sort, setSort]             = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });

  // Full list for parent-name lookup & parent-select dropdown (fetched once, cached)
  const [allRows, setAllRows] = useState<Category[]>([]);

  // drawer
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editing, setEditing]           = useState<Category | null>(null);
  const [form, setForm]                 = useState<Omit<Category, 'id'>>(emptyForm());
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState<string | null>(null);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── fetch full list for lookups (once) ──────────────────────────────────
  useEffect(() => {
    listCategories().then(setAllRows).catch(() => {});
  }, []);

  // ── fetch paginated data ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'name,asc';
      searchCategories({ search: search || undefined, page, size: 20, sort: sortParam })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); setTotalElements(p.totalElements || 0); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, refreshToken, sort]);

  // ── parent name lookup ─────────────────────────────────────────────────
  const catById = (id: string | null | undefined) =>
    id ? (allRows.find((r) => r.id === id)?.name ?? id) : null;

  // ── drawer helpers ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name, code: cat.code ?? '', parentId: cat.parentId ?? null,
      imageUrl: cat.imageUrl ?? null, description: cat.description ?? null,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const patch = <K extends keyof Omit<Category, 'id'>>(k: K, v: Omit<Category, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) { await updateCategory(editing.id, form); }
      else { await createCategory(form); }
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
      await deleteCategory(deleteTarget.id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── columns ────────────────────────────────────────────────────────────
  const columns: Column<Category>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Category',
      sortable: true,
      exportValue: (c) => c.name,
      render: (c) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={c.imageUrl ?? undefined} variant="rounded" sx={{
            bgcolor: brand.primary[50], color: brand.primary[700],
            width: 34, height: 34, fontSize: 13, fontWeight: 700, borderRadius: '8px',
          }}>
            {c.imageUrl ? undefined : <IconTag size={16} />}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
            {c.code && <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'ui-monospace', fontWeight: 600 }}>{c.code}</Typography>}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'parentId',
      label: 'Parent',
      sortable: false,
      exportValue: (c) => catById(c.parentId) ?? '',
      render: (c) => {
        const pName = catById(c.parentId);
        return pName ? (
          <Chip label={pName} size="small" sx={{
            bgcolor: brand.neutral[100], color: brand.neutral[700],
            fontWeight: 600, fontSize: '0.6875rem', borderRadius: '5px',
          }} />
        ) : (
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>Root</Typography>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      exportValue: (c) => c.description ?? '',
      render: (c) => (
        <Typography variant="body2" sx={{ color: brand.neutral[600] }} noWrap>
          {c.description ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 72,
      enableHiding: false,
      render: (c) => (
        <Stack direction="row" spacing={0.125} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(c); }} sx={{ color: brand.primary[600], p: 0.5 }}>
              <IconEdit size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }} sx={{ color: brand.error.main, p: 0.5 }}>
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
        title="Categories"
        subtitle="Organise your product catalog into groups"
        badge={totalElements ? { label: `${totalElements.toLocaleString()} categories`, tone: 'primary' } : undefined}
        actions={[{
          label: 'New category',
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
            size="small" placeholder="Search by name or code…"
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
        emptyText="No categories yet. Create one to get started."
        emptyIcon={<IconTag size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        getRowKey={(c) => c.id}
        onRowClick={openEdit}
        dense={dense}
        tableKey="categories"
        toolbarTitle={totalElements ? `${totalElements.toLocaleString()} ${totalElements === 1 ? 'category' : 'categories'}` : 'Categories'}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`categories-${new Date().toISOString().slice(0, 10)}`}
      />

      <EditDrawer
        open={drawerOpen}
        title={editing ? 'Edit category' : 'New category'}
        subtitle={editing ? editing.name : 'Add a category to organise products'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField label="Name" required fullWidth size="small" value={form.name} onChange={(e) => patch('name', e.target.value)} />
        <TextField label="Code" fullWidth size="small" value={form.code ?? ''} onChange={(e) => patch('code', e.target.value || null)} helperText="Optional short code (e.g. ELEC, FOOD)" />
        <TextField label="Parent category" select fullWidth size="small" value={form.parentId ?? ''} onChange={(e) => patch('parentId', e.target.value || null)}>
          <MenuItem value="">— None (root) —</MenuItem>
          {allRows.filter((r) => r.id !== editing?.id).map((r) => (
            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
          ))}
        </TextField>
        <TextField label="Image URL" fullWidth size="small" value={form.imageUrl ?? ''} onChange={(e) => patch('imageUrl', e.target.value || null)} helperText="Paste an image URL or leave empty" />
        <TextField label="Description" fullWidth size="small" multiline minRows={2} value={form.description ?? ''} onChange={(e) => patch('description', e.target.value || null)} />
      </EditDrawer>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete category?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> will be permanently removed. Products in this
            category will become uncategorised.
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
