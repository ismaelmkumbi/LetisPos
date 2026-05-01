import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  IconButton, InputAdornment, InputLabel, MenuItem, Select, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography, Chip,
} from '@mui/material';
import {
  IconClipboard, IconLayoutList, IconLayoutRows, IconPlus, IconSearch, IconX,
} from '@tabler/icons-react';
import { listWarehouses } from 'src/api/smartpos/inventory';
import { listCountStockRecords, openStockCount, type CountStockRecord } from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import type { UUID } from 'src/api/smartpos/types';

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  OPEN:      { bg: brand.primary[50],  fg: brand.primary[700] },
  POSTED:    { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED: { bg: brand.neutral[100], fg: brand.neutral[600] },
};

export default function CountStockPage() {
  const [rows, setRows] = useState<CountStockRecord[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dense, setDense] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await listCountStockRecords({ page, size: 20, search });
      setRows(p.content);
      setTotalPages(p.totalPages);
      setTotalElements(p.totalElements ?? rows.length);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    listWarehouses().then((ws) => setWarehouses(ws)).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newWarehouseId) return;
    setSubmitting(true);
    try {
      await openStockCount({ warehouseId: newWarehouseId as UUID });
      setCreateOpen(false);
      setNewWarehouseId('');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<CountStockRecord>[] = useMemo(() => [
    { key: 'ref', label: 'Reference', exportValue: (r) => r.ref, render: (r) => <strong>{r.ref}</strong> },
    { key: 'warehouseName', label: 'Warehouse', exportValue: (r) => r.warehouseName },
    { key: 'categoryName', label: 'Category', exportValue: (r) => r.categoryName ?? '' },
    { key: 'date', label: 'Date', exportValue: (r) => r.date },
    {
      key: 'status', label: 'Status', exportValue: (r) => r.status,
      render: (r) => {
        const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.OPEN;
        return (
          <Chip
            size="small"
            label={r.status}
            sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px' }}
          />
        );
      },
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Count Stock"
        subtitle="Physical stock counts — create a new count and download the tally sheet"
        actions={[{
          label: 'New Count',
          icon: <IconPlus size={18} />,
          onClick: () => setCreateOpen(true),
          variant: 'primary',
        }]}
      />

      {/* ── Filter bar ── */}
      <Box sx={{
        mb: 2, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`,
        bgcolor: '#fff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', overflow: 'hidden',
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 1 }}>
          <TextField
            size="small" placeholder="Search by reference…"
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

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No stock counts yet."
        emptyIcon={<IconClipboard size={32} />}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        getRowKey={(r) => r.id}
        dense={dense}
        tableKey="count-stock"
        toolbarTitle={totalElements ? `${totalElements.toLocaleString()} ${totalElements === 1 ? 'count' : 'counts'}` : 'Stock counts'}
        enableColumnVisibility
        enableExport
        exportFileName={`stock-counts-${new Date().toISOString().slice(0, 10)}`}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Stock Count</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse *</InputLabel>
              <Select value={newWarehouseId} label="Warehouse *" onChange={(e) => setNewWarehouseId(e.target.value)}>
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              After creating, a tally sheet will be available for download.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!newWarehouseId || submitting} onClick={handleCreate}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
