/**
 * IMEI / Serial registry — list, search, register new units, change status.
 *
 * Backed by product-service /api/v1/serials. Use this page as the home for
 * warranty enforcement: from here you can mark units RETURNED / DEFECTIVE
 * and look up by scanned IMEI.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, MenuItem, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  IconBarcode, IconLayoutList, IconLayoutRows, IconPlus, IconSearch, IconUpload, IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import {
  listSerials, createSerialsBulk,
  type CreateSerialBody, type ProductSerial, type SerialStatus,
} from 'src/api/smartpos/serials';
import { listProducts, type Product } from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import SerialEditDrawer from './SerialEditDrawer';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<SerialStatus, { bg: string; fg: string }> = {
  IN_STOCK:  { bg: brand.primary[50],  fg: brand.primary[700] },
  RESERVED:  { bg: brand.info.light,   fg: brand.info.dark },
  SOLD:      { bg: brand.success.light,fg: brand.success.dark },
  RETURNED:  { bg: brand.warning.light, fg: brand.warning.dark },
  DEFECTIVE: { bg: brand.error.light,  fg: brand.error.dark },
};

/** Days until warranty expiry, rounded. Negative = expired. */
const warrantyDays = (end: string): number => {
  const diff = new Date(end).getTime() - Date.now();
  return Math.round(diff / 86_400_000);
};

const WARRANTY_COLOURS: Record<string, { bg: string; fg: string }> = {
  valid:   { bg: brand.success.light, fg: brand.success.dark },
  soon:    { bg: brand.warning.light, fg: brand.warning.dark },
  expired: { bg: brand.error.light,   fg: brand.error.dark },
  none:    { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

export default function SerialsListPage() {
  const { t } = useTranslation('smartpos');
  const [rows, setRows] = useState<ProductSerial[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState<SerialStatus | ''>('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dense, setDense]     = useState(true);
  const [sort, setSort]       = useState<{ id: string; desc: boolean } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSerial | null>(null);

  // ── Bulk register ────────────────────────────────────────────────────────────
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

  // ── data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      listSerials({ search, status: status || undefined, page, size: 20, sort: sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : undefined })
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

  // ── columns ────────────────────────────────────────────────────────────────
  const cols: Column<ProductSerial>[] = useMemo(() => [
    {
      key: 'serialNumber',
      label: 'Serial / IMEI',
      sortable: true,
      exportValue: (s) => s.serialNumber,
      render: (s) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {s.serialNumber}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            {s.serialType}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      sortable: true,
      exportValue: (s) => s.status,
      render: (s) => {
        const c = STATUS_COLOURS[s.status];
        return <Chip label={s.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600, fontSize: '0.6875rem', borderRadius: '6px' }} />;
      },
    },
    {
      key: 'saleRef', label: 'Sale ref',
      sortable: true,
      exportValue: (s) => s.saleRef ?? '',
      render: (s) => s.saleRef ?? '—',
    },
    {
      key: 'purchaseRef', label: 'PO ref',
      sortable: true,
      exportValue: (s) => s.purchaseRef ?? '',
      render: (s) => s.purchaseRef ?? '—',
    },
    {
      key: 'warranty', label: 'Warranty',
      sortable: false,
      exportValue: (s) => s.warrantyEnd ?? 'None',
      render: (s) => {
        if (!s.warrantyEnd) {
          return <Chip label="None" size="small" sx={{ bgcolor: WARRANTY_COLOURS.none.bg, color: WARRANTY_COLOURS.none.fg, fontWeight: 600, fontSize: '0.6875rem', borderRadius: '6px' }} />;
        }
        const days = warrantyDays(s.warrantyEnd);
        const tone = days <= 0 ? 'expired' : days <= 30 ? 'soon' : 'valid';
        const c = WARRANTY_COLOURS[tone];
        const label = days <= 0 ? 'Expired' : days <= 30 ? `${days}d left` : `Until ${s.warrantyEnd}`;
        return (
          <Tooltip title={`Warranty ends ${s.warrantyEnd} (${days <= 0 ? 'expired' : `${days} days remaining`})`}>
            <Chip label={label} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px' }} />
          </Tooltip>
        );
      },
    },
  ], []);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title={t('nav.serials', { defaultValue: 'Serials & IMEI' })}
        subtitle="Track serialised units; manage warranty status"
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

      {/* ── Filter bar ── */}
      <Box sx={{
        mb: 2, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`,
        bgcolor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', overflow: 'hidden',
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 1 }}>
          <TextField
            size="small" placeholder="Search by IMEI / serial…"
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
          <TextField
            select size="small" placeholder="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as SerialStatus | ''); setPage(0); }}
            sx={{
              minWidth: 150,
              '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: brand.neutral[50], fontSize: '0.8125rem' },
              '& .MuiOutlinedInput-input': { py: 0.75 },
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {(['IN_STOCK','RESERVED','SOLD','RETURNED','DEFECTIVE'] as SerialStatus[]).map((s) =>
              <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
          </TextField>
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

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        onRowClick={(s) => { setEditing(s); setDrawerOpen(true); }}
        getRowKey={(s) => s.id}
        dense={dense}
        tableKey="serials"
        toolbarTitle={totalElements ? `${totalElements.toLocaleString()} ${totalElements === 1 ? 'serial' : 'serials'}` : 'Serials'}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`serials-${new Date().toISOString().slice(0, 10)}`}
        emptyText="No serials registered yet"
        emptyIcon={<IconBarcode size={32} />}
      />

      <SerialEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />

      {/* ── Bulk register dialog ── */}
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
