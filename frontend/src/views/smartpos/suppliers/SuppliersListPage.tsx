import { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Chip, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconSearch, IconMail, IconPhone } from '@tabler/icons-react';

import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import SupplierEditDrawer from './SupplierEditDrawer';
import { brand } from 'src/theme/smartpos/brand';

export default function SuppliersListPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listSuppliers({ search, page, size: 20, sort: 'name,asc' })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, page, refreshToken]);

  const columns: Column<Supplier>[] = [
    {
      key: 'name', label: 'Supplier',
      render: (s) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: brand.primary[50], color: brand.primary[700], width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
            {s.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
            {s.code && <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{s.code}</Typography>}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'contact', label: 'Contact',
      render: (s) => (
        <Stack spacing={0.25}>
          {s.email && <Stack direction="row" spacing={0.5} alignItems="center"><IconMail size={14} color={brand.neutral[500]} /><Typography variant="caption">{s.email}</Typography></Stack>}
          {s.phone && <Stack direction="row" spacing={0.5} alignItems="center"><IconPhone size={14} color={brand.neutral[500]} /><Typography variant="caption">{s.phone}</Typography></Stack>}
          {!s.email && !s.phone && <Typography variant="caption" sx={{ color: brand.neutral[400] }}>—</Typography>}
        </Stack>
      ),
    },
    {
      key: 'location', label: 'Location',
      render: (s) => <Typography variant="body2">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</Typography>,
    },
    {
      key: 'active', label: 'Status', align: 'center',
      render: (s) => (
        <Chip label={s.active ? 'Active' : 'Inactive'} size="small" sx={{
          bgcolor: s.active ? brand.success.light : brand.neutral[100],
          color:   s.active ? brand.success.dark  : brand.neutral[600], fontWeight: 600,
        }} />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Suppliers" subtitle="Vendors you procure from"
        action={{ label: 'New supplier', icon: <IconPlus size={18} />, onClick: () => { setEditing(null); setDrawerOpen(true); } }}
      />
      <TextField
        fullWidth size="small" placeholder="Search by name or email…"
        value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        sx={{ mb: 2, maxWidth: 420 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} color={brand.neutral[500]} /></InputAdornment> }}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading} emptyText="No suppliers yet."
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(s) => s.id}
        onRowClick={(s) => { setEditing(s); setDrawerOpen(true); }}
      />
      <SupplierEditDrawer
        open={drawerOpen} initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setRefreshToken((n) => n + 1)}
      />
    </Box>
  );
}
