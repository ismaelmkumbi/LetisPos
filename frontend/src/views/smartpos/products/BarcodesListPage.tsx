import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, IconButton,
  ListItemIcon, Menu, MenuItem,
  Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconBarcode, IconCopy, IconDotsVertical, IconEye, IconExternalLink,
  IconLayoutList, IconLayoutRows,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import { searchBarcodes, type BarcodeWithProduct } from 'src/api/smartpos/products';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import { brand } from 'src/theme/smartpos/brand';

const PAGE_SIZE = 20;

const BARCODE_COLORS: Record<string, { bg: string; color: string }> = {
  CODE128: { bg: brand.neutral[100], color: brand.neutral[700] },
  CODE39:  { bg: brand.neutral[100], color: brand.neutral[700] },
  EAN13:   { bg: brand.primary[50],  color: brand.primary[700] },
  EAN8:    { bg: brand.primary[50],  color: brand.primary[700] },
  UPCA:    { bg: brand.accent[50],   color: brand.accent[700] },
  UPC:     { bg: brand.accent[50],   color: brand.accent[700] },
  QR:      { bg: brand.info.light,   color: brand.info.dark },
};

export default function BarcodesListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BarcodeWithProduct[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dense, setDense] = useState(false);
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sel = useSelection(rows);

  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: BarcodeWithProduct } | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : undefined;
      searchBarcodes({ search: search || undefined, page, size: PAGE_SIZE, sort: sortParam })
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
  }, [search, page, sort]);

  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const copyBarcode = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyToast('Copied to clipboard');
      setTimeout(() => setCopyToast(null), 2000);
      closeRowMenu();
    } catch {
      setCopyToast('Unable to copy (clipboard permission)');
      setTimeout(() => setCopyToast(null), 2500);
    }
  }, [closeRowMenu]);

  const handleBulkCopy = useCallback(async () => {
    const values = rows.filter((r) => sel.selectedIds.has(r.id)).map((r) => r.barcode);
    if (!values.length) return;
    try {
      await navigator.clipboard.writeText(values.join('\n'));
      setCopyToast(`${values.length} barcode${values.length === 1 ? '' : 's'} copied`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('Unable to copy');
      setTimeout(() => setCopyToast(null), 2500);
    }
  }, [rows, sel.selectedIds]);

  const actionBtnSx = {
    p: 0.5, borderRadius: '8px',
    color: brand.neutral[400],
    '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
  };

  const columns: Column<BarcodeWithProduct>[] = useMemo(() => [
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
      key: 'barcode',
      label: 'Barcode',
      sortable: false,
      exportValue: (b) => b.barcode,
      render: (b) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '8px', bgcolor: brand.neutral[100],
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: `1px solid ${brand.neutral[200]}`,
          }}>
            <IconBarcode size={16} color={brand.neutral[500]} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: '0.8125rem' }} noWrap>
              {b.barcode}
            </Typography>
            {b.primary && (
              <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>Primary</Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'barcodeType',
      label: 'Symbology',
      width: 100,
      sortable: false,
      exportValue: (b) => b.barcodeType,
      render: (b) => {
        const c = BARCODE_COLORS[b.barcodeType] ?? BARCODE_COLORS.CODE128;
        return (
          <Chip label={b.barcodeType} size="small" sx={{
            height: 26, bgcolor: c.bg, color: c.color,
            fontWeight: 700, fontSize: '0.6875rem', borderRadius: '8px',
          }} />
        );
      },
    },
    {
      key: 'productName',
      label: 'Product',
      sortable: false,
      exportValue: (b) => `${b.productName ?? ''} (${b.productCode ?? ''})`,
      render: (b) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>{b.productName ?? '—'}</Typography>
          {b.productCode && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'ui-monospace', fontWeight: 600 }} noWrap>
              {b.productCode}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'variantId',
      label: 'Scope',
      width: 100,
      sortable: false,
      exportValue: (b) => (b.variantId ? 'Variant' : 'Base product'),
      render: (b) =>
        b.variantId ? (
          <Chip label="Variant" size="small" sx={{ height: 26, bgcolor: brand.accent[50], color: brand.accent[700], fontWeight: 600, fontSize: '0.6875rem', borderRadius: '8px' }} />
        ) : (
          <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 600 }}>Base product</Typography>
        ),
    },
    {
      key: 'primary',
      label: 'Status',
      align: 'center',
      width: 100,
      sortable: false,
      exportValue: (b) => (b.primary ? 'Primary' : 'Alt'),
      render: (b) => (
        <StatusBadge label={b.primary ? 'Primary' : 'Alt'} tone={b.primary ? 'success' : 'neutral'} />
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 52,
      enableHiding: false,
      exportValue: () => '',
      render: (b) => (
        <Tooltip title="More actions">
          <IconButton
            size="small"
            sx={actionBtnSx}
            aria-haspopup="true"
            onClick={(e) => { e.stopPropagation(); setRowMenu({ anchor: e.currentTarget, row: b }); }}
          >
            <IconDotsVertical size={14} />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [page, sel.selectionColumn]);

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
        title="Barcodes"
        subtitle="All barcodes assigned across your product catalog in one place."
      />

      {copyToast && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCopyToast(null)}>{copyToast}</Alert>}

      <FilterBar
        searchPlaceholder="Search barcode, product name or SKU…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search barcodes"
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
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="barcode">
          <Button size="small" variant="outlined" startIcon={<IconCopy size={14} />} onClick={() => void handleBulkCopy()} sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Copy barcodes
          </Button>
        </BulkActionBar>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No barcodes found."
        emptyIcon={<IconBarcode size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        getRowKey={(b) => b.id}
        onRowClick={(b) => navigate(`/smartpos/products/${b.productId}`)}
        dense={dense}
        tableKey="barcodes"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} barcodes` : undefined}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`barcodes-${new Date().toISOString().slice(0, 10)}`}
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
            navigate(`/smartpos/products/${rowMenu.row.productId}`);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><IconEye size={18} /></ListItemIcon>
          View product
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            navigate(`/smartpos/products/${rowMenu.row.productId}/edit`);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><IconExternalLink size={18} /></ListItemIcon>
          Edit product
        </MenuItem>
        <MenuItem dense onClick={() => { if (rowMenu) void copyBarcode(rowMenu.row.barcode); }}>
          <ListItemIcon sx={{ minWidth: 36 }}><IconCopy size={18} /></ListItemIcon>
          Copy barcode
        </MenuItem>
      </Menu>
    </Box>
  );
}
