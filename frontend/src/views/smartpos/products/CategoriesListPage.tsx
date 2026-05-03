import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton,
  ListItemIcon, Menu, MenuItem,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconCopy, IconDotsVertical, IconEdit,
  IconEye, IconLayoutList, IconLayoutRows, IconPlus, IconTag, IconTrash,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  listCategories, searchCategories, createCategory, updateCategory, deleteCategory,
  type Category,
} from 'src/api/smartpos/products';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const emptyForm = (): Omit<Category, 'id'> => ({
  name: '', code: '', parentId: null, imageUrl: null, description: null,
});

const actionBtnSx = {
  p: 0.5, borderRadius: '8px',
  color: brand.neutral[400],
  '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
};

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
  const [dense, setDense]           = useState(false);
  const [sort, setSort]             = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sel = useSelection(rows);

  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: Category } | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const [allRows, setAllRows] = useState<Category[]>([]);

  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editing, setEditing]           = useState<Category | null>(null);
  const [form, setForm]                 = useState<Omit<Category, 'id'>>(emptyForm());
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    listCategories().then(setAllRows).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'name,asc';
      searchCategories({ search: search || undefined, page, size: PAGE_SIZE, sort: sortParam })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); setTotalElements(p.totalElements || 0); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, page, refreshToken, sort]);

  const catById = useCallback(
    (id: string | null | undefined) => (id ? (allRows.find((r) => r.id === id)?.name ?? id) : null),
    [allRows],
  );

  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const duplicateCategory = useCallback(async (c: Category) => {
    try {
      await createCategory({
        name: `${c.name} (Copy)`,
        code: '',
        parentId: c.parentId ?? null,
        imageUrl: c.imageUrl ?? null,
        description: c.description ?? null,
      });
      listCategories().then(setAllRows).catch(() => {});
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

  const openEdit = useCallback((cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name, code: cat.code ?? '', parentId: cat.parentId ?? null,
      imageUrl: cat.imageUrl ?? null, description: cat.description ?? null,
    });
    setFormError(null);
    setDrawerOpen(true);
  }, []);

  const patch = <K extends keyof Omit<Category, 'id'>>(k: K, v: Omit<Category, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) { await updateCategory(editing.id, form); }
      else { await createCategory(form); }
      listCategories().then(setAllRows).catch(() => {});
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
      await Promise.all(Array.from(sel.selectedIds).map((id) => deleteCategory(id)));
      listCategories().then(setAllRows).catch(() => {});
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
      await deleteCategory(deleteTarget.id);
      listCategories().then(setAllRows).catch(() => {});
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns: Column<Category>[] = useMemo(() => [
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
      label: 'Category',
      sortable: true,
      exportValue: (c) => c.name,
      render: (c) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            src={c.imageUrl ?? undefined}
            variant="rounded"
            sx={{
              bgcolor: brand.primary[50], color: brand.primary[700],
              width: 30, height: 30, fontSize: 12, fontWeight: 700,
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '8px',
              flexShrink: 0,
            }}
          >
            {c.imageUrl ? undefined : <IconTag size={15} />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }} noWrap>
              {c.name}
            </Typography>
            {c.code && (
              <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'ui-monospace', fontWeight: 600, display: 'block' }} noWrap>
                {c.code}
              </Typography>
            )}
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
          <Chip
            label={pName}
            size="small"
            sx={{
              height: 26, bgcolor: brand.primary[50], color: brand.primary[700],
              fontWeight: 600, fontSize: '0.6875rem', borderRadius: '8px',
              border: `1px solid ${brand.primary[200]}`,
            }}
          />
        ) : (
          <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 600 }}>Root</Typography>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      exportValue: (c) => c.description ?? '',
      render: (c) => (
        <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
          {c.description ?? '—'}
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
      render: (c) => (
        <Tooltip title="More actions">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setRowMenu({ anchor: e.currentTarget, row: c }); }}
            sx={actionBtnSx}
            aria-haspopup="true"
          >
            <IconDotsVertical size={14} />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [catById, page, sel]);

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
        title="Categories"
        subtitle="Organise your product catalog into groups in one place."
        actions={[{
          label: 'New category',
          icon: <IconPlus size={18} />,
          onClick: openCreate,
        }]}
      />

      <FilterBar
        searchPlaceholder="Search by name or code…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search categories"
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
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="category">
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<IconTrash size={14} />}
            onClick={() => setBatchDeleteOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Delete
          </Button>
        </BulkActionBar>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No categories match these filters."
        emptyIcon={<IconTag size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        getRowKey={(c) => c.id}
        onRowClick={openEdit}
        dense={dense}
        tableKey="categories"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} categories` : undefined}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`categories-${new Date().toISOString().slice(0, 10)}`}
      />

      <Menu
        anchorEl={rowMenu?.anchor ?? null}
        open={Boolean(rowMenu)}
        onClose={closeRowMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            openEdit(rowMenu.row);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <IconEye size={18} />
          </ListItemIcon>
          View details
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            openEdit(rowMenu.row);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <IconEdit size={18} />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            void duplicateCategory(rowMenu.row);
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <IconCopy size={18} />
          </ListItemIcon>
          Duplicate
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            setDeleteTarget(rowMenu.row);
            closeRowMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconTrash size={18} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

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

      <Dialog open={batchDeleteOpen} onClose={() => !batchDeleting && setBatchDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete {sel.selectedIds.size} {sel.selectedIds.size === 1 ? 'category' : 'categories'}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            These categories will be permanently removed. Products in these categories will become uncategorised.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} disabled={batchDeleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBatchDelete} disabled={batchDeleting}>
            {batchDeleting ? 'Deleting…' : `Delete ${sel.selectedIds.size}`}
          </Button>
        </DialogActions>
      </Dialog>

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
