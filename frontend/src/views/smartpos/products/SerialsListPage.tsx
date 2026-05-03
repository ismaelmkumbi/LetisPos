import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, IconButton,
  ListItemIcon, Menu, MenuItem, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconBarcode, IconDotsVertical, IconEdit, IconExternalLink, IconEye,
  IconLayoutList, IconLayoutRows, IconPlus, IconTrash, IconUpload,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import {
  listSerials, createSerialsBulk, deleteSerial,
  type CreateSerialBody, type ProductSerial, type SerialStatus,
} from 'src/api/smartpos/serials';
import { listProducts, type Product } from 'src/api/smartpos/products';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import SerialEditDrawer from './SerialEditDrawer';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const STATUS_COLOURS: Record<SerialStatus, { bg: string; fg: string }> = {
  IN_STOCK:  { bg: brand.primary[50],  fg: brand.primary[700] },
  RESERVED:  { bg: brand.info.light,   fg: brand.info.dark },
  SOLD:      { bg: brand.success.light, fg: brand.success.dark },
  RETURNED:  { bg: brand.warning.light, fg: brand.warning.dark },
  DEFECTIVE: { bg: brand.error.light,   fg: brand.error.dark },
};

const STATUS_LABEL = (s: SerialStatus): string => s.replace(/_/g, ' ');

const warrantyDays = (end: string): number => {
  const diff = new Date(end).getTime() - Date.now();
  return Math.round(diff / 86_400_000);
};

const WARRANTY_COLOURS: Record<string, { bg: string; fg: string }> = {
  valid:   { bg: brand.success.light, fg: brand.success.dark },
  soon:    { bg: brand.warning.light, fg: brand.warning.dark },
  expired: { bg: brand.error.light,   fg: brand.error.dark },
  none:    { bg: brand.neutral[100],    fg: brand.neutral[500] },
};

const actionBtnSx = {
  p: 0.5, borderRadius: '8px',
  color: brand.neutral[400],
  '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
};

export default function SerialsListPage() {
  const { t } = useTranslation('smartpos');
  const navigate = useNavigate();

  const [rows, setRows] = useState<ProductSerial[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SerialStatus | ''>('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dense, setDense] = useState(false);
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sel = useSelection(rows);

  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: ProductSerial } | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProductSerial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSerial | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkProduct, setBulkProduct] = useState<Product | null>(null);
  const [bulkSerials, setBulkSerials] = useState('');
  const [bulkType, setBulkType] = useState<'SERIAL' | 'IMEI' | 'MAC'>('SERIAL');
  const [bulkWarrantyStart, setBulkWarrantyStart] = useState('');
  const [bulkWarrantyEnd, setBulkWarrantyEnd] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const productSearchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleProductSearch = useCallback((query: string) => {
    clearTimeout(productSearchRef.current);
    productSearchRef.current = setTimeout(() => {
      listProducts({ search: query || undefined, page: 0, size: 50 })
        .then((p) => setProductOptions(p.content))
        .catch(() => {});
    }, 300);
  }, []);

  useEffect(() => { handleProductSearch(''); }, [handleProductSearch]);

  const handleBulkRegister = async () => {
    if (!bulkProduct) { setBulkError('Select a product.'); return; }
    const lines = bulkSerials.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) { setBulkError('Enter at least one serial number.'); return; }
    setBulkSubmitting(true);
    setBulkError(null);
    try {
      const items: CreateSerialBody[] = lines.map((serialNumber) => ({
        productId: bulkProduct.id,
        serialNumber,
        serialType: bulkType,
        warrantyStart: bulkWarrantyStart || undefined,
        warrantyEnd: bulkWarrantyEnd || undefined,
      }));
      await createSerialsBulk(items);
      setBulkOpen(false);
      resetBulk();
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Bulk registration failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const resetBulk = () => {
    setBulkProduct(null);
    setBulkSerials('');
    setBulkType('SERIAL');
    setBulkWarrantyStart('');
    setBulkWarrantyEnd('');
    setBulkError(null);
  };

  const openSerial = useCallback((s: ProductSerial) => {
    setEditing(s);
    setDrawerOpen(true);
  }, []);

  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => deleteSerial(id)));
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
      await deleteSerial(deleteTarget.id);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      listSerials({
        search,
        status: status || undefined,
        page,
        size: PAGE_SIZE,
        sort: sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : undefined,
      })
        .then((p) => {
          if (cancelled) return;
          setRows(p.content);
          setTotalPages(p.totalPages || 1);
          setTotalElements(p.totalElements || 0);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search, status, page, refreshToken, sort]);

  const cols: Column<ProductSerial>[] = useMemo(() => [
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
      key: 'serialNumber',
      label: 'Serial / IMEI',
      sortable: true,
      exportValue: (s) => s.serialNumber,
      render: (s) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8125rem' }}>
            {s.serialNumber}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>{s.serialType}</Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      sortable: true,
      exportValue: (s) => s.status,
      render: (s) => {
        const c = STATUS_COLOURS[s.status];
        return <Chip label={STATUS_LABEL(s.status)} size="small" sx={{ height: 26, bgcolor: c.bg, color: c.fg, fontWeight: 600, fontSize: '0.6875rem', borderRadius: '8px' }} />;
      },
    },
    {
      key: 'saleRef', label: 'Sale ref',
      sortable: true,
      exportValue: (s) => s.saleRef ?? '',
      render: (s) => <Typography sx={{ fontSize: '0.8125rem' }}>{s.saleRef ?? '—'}</Typography>,
    },
    {
      key: 'purchaseRef', label: 'PO ref',
      sortable: true,
      exportValue: (s) => s.purchaseRef ?? '',
      render: (s) => <Typography sx={{ fontSize: '0.8125rem' }}>{s.purchaseRef ?? '—'}</Typography>,
    },
    {
      key: 'warranty', label: 'Warranty',
      sortable: false,
      exportValue: (s) => s.warrantyEnd ?? 'None',
      render: (s) => {
        if (!s.warrantyEnd) {
          return <Chip label="None" size="small" sx={{ height: 26, bgcolor: WARRANTY_COLOURS.none.bg, color: WARRANTY_COLOURS.none.fg, fontWeight: 600, fontSize: '0.6875rem', borderRadius: '8px' }} />;
        }
        const days = warrantyDays(s.warrantyEnd);
        const tone = days <= 0 ? 'expired' : days <= 30 ? 'soon' : 'valid';
        const c = WARRANTY_COLOURS[tone];
        const label = days <= 0 ? 'Expired' : days <= 30 ? `${days}d left` : `Until ${s.warrantyEnd}`;
        return (
          <Tooltip title={`Warranty ends ${s.warrantyEnd} (${days <= 0 ? 'expired' : `${days} days remaining`})`}>
            <Chip label={label} size="small" sx={{ height: 26, bgcolor: c.bg, color: c.fg, fontWeight: 700, fontSize: '0.6875rem', borderRadius: '8px' }} />
          </Tooltip>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 52,
      enableHiding: false,
      exportValue: () => '',
      render: (s) => (
        <Tooltip title="More actions">
          <IconButton
            size="small"
            sx={actionBtnSx}
            aria-haspopup="true"
            onClick={(e) => { e.stopPropagation(); setRowMenu({ anchor: e.currentTarget, row: s }); }}
          >
            <IconDotsVertical size={14} />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [page, sel]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) activeFilters.push({ key: 'search', label: `Search: ${search.trim()}`, clear: () => { setSearch(''); setPage(0); } });
  if (status) activeFilters.push({ key: 'status', label: `Status: ${STATUS_LABEL(status)}`, clear: () => { setStatus(''); setPage(0); } });
  if (dense) activeFilters.push({ key: 'density', label: 'Compact table', clear: () => setDense(false) });

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setStatus('');
    setDense(false);
    setPage(0);
  }, []);

  return (
    <Box>
      <PageHeader
        title={t('nav.serials', { defaultValue: 'Serials & IMEI' })}
        subtitle="Track serialised units; manage warranty and status in one place."
        actions={[
          {
            label: 'Bulk register',
            icon: <IconUpload size={18} />,
            variant: 'ghost',
            onClick: () => { resetBulk(); setBulkOpen(true); },
          },
          {
            label: 'Register new',
            icon: <IconPlus size={18} />,
            variant: 'primary',
            onClick: () => { setEditing(null); setDrawerOpen(true); },
          },
        ]}
      />

      <FilterBar
        searchPlaceholder="Search by IMEI / serial…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search serials"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAllFilters}
      >
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as SerialStatus | ''); setPage(0); }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {(['IN_STOCK','RESERVED','SOLD','RETURNED','DEFECTIVE'] as SerialStatus[]).map((sVal) =>
            <MenuItem key={sVal} value={sVal}>{STATUS_LABEL(sVal)}</MenuItem>)}
        </TextField>

        <Box sx={{ width: '100%' }} />

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

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="serial">
          <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={14} />} onClick={() => setBatchDeleteOpen(true)} sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Delete
          </Button>
        </BulkActionBar>
      )}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={openSerial}
        getRowKey={(s) => s.id}
        dense={dense}
        tableKey="serials"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} serials` : undefined}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`serials-${new Date().toISOString().slice(0, 10)}`}
        emptyText="No serials registered yet"
        emptyIcon={<IconBarcode size={32} />}
      />

      <Menu
        anchorEl={rowMenu?.anchor ?? null}
        open={Boolean(rowMenu)}
        onClose={closeRowMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem dense onClick={() => { if (rowMenu) { openSerial(rowMenu.row); closeRowMenu(); } }}>
          <ListItemIcon sx={{ minWidth: 36 }}><IconEye size={18} /></ListItemIcon>
          View details
        </MenuItem>
        <MenuItem dense onClick={() => { if (rowMenu) { openSerial(rowMenu.row); closeRowMenu(); } }}>
          <ListItemIcon sx={{ minWidth: 36 }}><IconEdit size={18} /></ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            navigate(`/smartpos/products/${rowMenu.row.productId}`);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><IconExternalLink size={18} /></ListItemIcon>
          View product
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

      <SerialEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />

      <Dialog open={batchDeleteOpen} onClose={() => !batchDeleting && setBatchDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete {sel.selectedIds.size} {sel.selectedIds.size === 1 ? 'serial' : 'serials'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>Registered serial records will be permanently removed. This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} disabled={batchDeleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBatchDelete} disabled={batchDeleting}>
            {batchDeleting ? 'Deleting…' : `Delete ${sel.selectedIds.size}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete serial record?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
              {deleteTarget?.serialNumber}
            </Typography>
            {' '}will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkOpen} onClose={() => !bulkSubmitting && setBulkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconBarcode size={20} />
          Bulk register serials / IMEIs
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {bulkError && <Alert severity="error" onClose={() => setBulkError(null)}>{bulkError}</Alert>}

            <Autocomplete
              size="small"
              options={productOptions}
              value={bulkProduct}
              onChange={(_, v) => { setBulkProduct(v); setBulkError(null); }}
              getOptionLabel={(o) => `${o.name} (${o.code})`}
              renderInput={(params) => (
                <TextField {...params} label="Product *" placeholder="Search products…"
                  onChange={(e) => handleProductSearch(e.target.value)} />
              )}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderOption={(props, o) => (
                <li {...props} key={o.id}>
                  <Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.name}</Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{o.code}</Typography>
                  </Stack>
                </li>
              )}
            />

            <TextField
              label="Serial numbers / IMEIs *"
              placeholder="One per line&#10;123456789012345&#10;987654321098765"
              value={bulkSerials}
              onChange={(e) => setBulkSerials(e.target.value)}
              size="small" multiline minRows={4} maxRows={10} fullWidth
              helperText={bulkSerials ? `${bulkSerials.split('\n').filter(Boolean).length} serials to register` : 'Enter one serial / IMEI per line'}
            />

            <TextField
              select size="small" label="Type"
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value as 'SERIAL' | 'IMEI' | 'MAC')}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="SERIAL">Serial</MenuItem>
              <MenuItem value="IMEI">IMEI</MenuItem>
              <MenuItem value="MAC">MAC address</MenuItem>
            </TextField>

            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Warranty start" type="date" size="small"
                value={bulkWarrantyStart}
                onChange={(e) => setBulkWarrantyStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Warranty end" type="date" size="small"
                value={bulkWarrantyEnd}
                onChange={(e) => setBulkWarrantyEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkRegister} disabled={bulkSubmitting} sx={{ fontWeight: 700 }}>
            {bulkSubmitting ? 'Registering…' : `Register ${bulkSerials.split('\n').filter(Boolean).length || ''} serials`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
