/**
 * BarcodesListPage — paginated barcode registry with product context.
 *
 * Backed by the dedicated /api/v1/barcodes/search endpoint that returns
 * barcode rows enriched with product name/code in a single page.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Chip, IconButton, InputAdornment, Stack,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconBarcode, IconLayoutList, IconLayoutRows, IconSearch, IconX,
} from '@tabler/icons-react';

import { searchBarcodes, type BarcodeWithProduct } from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

// ── barcode type colors ───────────────────────────────────────────────────────

const BARCODE_COLORS: Record<string, { bg: string; color: string }> = {
  CODE128: { bg: brand.neutral[100],    color: brand.neutral[700] },
  CODE39:  { bg: brand.neutral[100],    color: brand.neutral[700] },
  EAN13:   { bg: brand.primary[50],     color: brand.primary[700] },
  EAN8:    { bg: brand.primary[50],     color: brand.primary[700] },
  UPCA:    { bg: brand.accent[50],      color: brand.accent[700] },
  UPC:     { bg: brand.accent[50],      color: brand.accent[700] },
  QR:      { bg: brand.info.light,      color: brand.info.dark },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BarcodesListPage() {
  const [rows, setRows]             = useState<BarcodeWithProduct[]>([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [dense, setDense]           = useState(true);
  const [sort, setSort]             = useState<{ id: string; desc: boolean } | null>(null);

  // ── fetch paginated barcodes ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : undefined;
      searchBarcodes({ search: search || undefined, page, size: 20, sort: sortParam })
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

  // ── columns ──────────────────────────────────────────────────────────────

  const columns: Column<BarcodeWithProduct>[] = useMemo(() => [
    {
      key: 'barcode',
      label: 'Barcode',
      sortable: false,
      exportValue: (b) => b.barcode,
      render: (b) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: brand.neutral[100], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconBarcode size={18} color={brand.neutral[500]} />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {b.barcode}
            </Typography>
            {b.primary && (
              <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
                Primary
              </Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'barcodeType',
      label: 'Type',
      width: 100,
      sortable: false,
      exportValue: (b) => b.barcodeType,
      render: (b) => {
        const c = BARCODE_COLORS[b.barcodeType] ?? BARCODE_COLORS.CODE128;
        return (
          <Chip label={b.barcodeType} size="small" sx={{
            bgcolor: c.bg, color: c.color,
            fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px',
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
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.productName ?? '—'}</Typography>
          {b.productCode && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'ui-monospace', fontWeight: 600 }}>
              {b.productCode}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'variantId',
      label: 'Type',
      width: 100,
      sortable: false,
      exportValue: (b) => b.variantId ? 'Variant' : 'Base product',
      render: (b) =>
        b.variantId ? (
          <Chip label="Variant" size="small" sx={{ bgcolor: brand.accent[50], color: brand.accent[700], fontWeight: 600, fontSize: '0.6875rem' }} />
        ) : (
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>Base product</Typography>
        ),
    },
    {
      key: 'primary',
      label: 'Status',
      align: 'center',
      width: 100,
      sortable: false,
      exportValue: (b) => b.primary ? 'Primary' : 'Alt',
      render: (b) => (
        <StatusBadge label={b.primary ? 'Primary' : 'Alt'} tone={b.primary ? 'success' : 'neutral'} />
      ),
    },
  ], []);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Barcodes"
        subtitle="All barcodes assigned across your product catalog"
        badge={totalElements ? { label: `${totalElements.toLocaleString()} barcodes`, tone: 'primary' } : undefined}
      />

      {/* ── Filter bar ── */}
      <Box sx={{
        mb: 2, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`,
        bgcolor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', overflow: 'hidden',
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 1 }}>
          <TextField
            size="small" placeholder="Search barcode, product name or SKU…"
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
        emptyText="No barcodes found."
        emptyIcon={<IconBarcode size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        getRowKey={(b) => b.id}
        dense={dense}
        tableKey="barcodes"
        toolbarTitle={totalElements ? `${totalElements.toLocaleString()} ${totalElements === 1 ? 'barcode' : 'barcodes'}` : 'Barcodes'}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`barcodes-${new Date().toISOString().slice(0, 10)}`}
      />
    </Box>
  );
}
