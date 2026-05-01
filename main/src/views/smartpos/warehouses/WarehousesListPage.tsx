import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { IconPlus, IconBuildingWarehouse, IconMail, IconPhone } from '@tabler/icons-react';

import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import WarehouseEditDrawer from './WarehouseEditDrawer';
import { brand } from 'src/theme/smartpos/brand';

export default function WarehousesListPage() {
  const [rows, setRows] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listWarehouses()
      .then((ws) => { if (!cancelled) setRows(ws); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshToken]);

  const columns: Column<Warehouse>[] = [
    {
      key: 'name', label: 'Warehouse',
      render: (w) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" sx={{ bgcolor: brand.primary[50], color: brand.primary[700], width: 36, height: 36 }}>
            <IconBuildingWarehouse size={18} />
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{w.name}</Typography>
            {w.code && <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{w.code}</Typography>}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'location', label: 'Location',
      render: (w) => <Typography variant="body2">{[w.city, w.country, w.zip].filter(Boolean).join(', ') || '—'}</Typography>,
    },
    {
      key: 'contact', label: 'Contact',
      render: (w) => (
        <Stack spacing={0.25}>
          {w.email && <Stack direction="row" spacing={0.5} alignItems="center"><IconMail size={14} color={brand.neutral[500]} /><Typography variant="caption">{w.email}</Typography></Stack>}
          {w.phone && <Stack direction="row" spacing={0.5} alignItems="center"><IconPhone size={14} color={brand.neutral[500]} /><Typography variant="caption">{w.phone}</Typography></Stack>}
          {!w.email && !w.phone && <Typography variant="caption" sx={{ color: brand.neutral[400] }}>—</Typography>}
        </Stack>
      ),
    },
    {
      key: 'active', label: 'Status', align: 'center',
      render: (w) => (
        <Chip label={w.active ? 'Active' : 'Inactive'} size="small" sx={{
          bgcolor: w.active ? brand.success.light : brand.neutral[100],
          color:   w.active ? brand.success.dark  : brand.neutral[600], fontWeight: 600,
        }} />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Warehouses" subtitle="Physical stock locations"
        action={{ label: 'New warehouse', icon: <IconPlus size={18} />, onClick: () => { setEditing(null); setDrawerOpen(true); } }}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No warehouses yet. Create your first location."
        getRowKey={(w) => w.id}
        onRowClick={(w) => { setEditing(w); setDrawerOpen(true); }}
      />
      <WarehouseEditDrawer
        open={drawerOpen} initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setRefreshToken((n) => n + 1)}
      />
    </Box>
  );
}
