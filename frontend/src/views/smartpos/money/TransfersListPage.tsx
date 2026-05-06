import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';

import {
  listTransfers, listWarehouses,
  type Transfer, type TransferStatus, type Warehouse,
} from 'src/api/smartpos/inventory';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

const TONE: Record<TransferStatus, { bg: string; fg: string }> = {
  DRAFT:      { bg: brand.neutral[100],  fg: brand.neutral[700] },
  IN_TRANSIT: { bg: brand.warning.light, fg: brand.warning.dark },
  COMPLETED:  { bg: brand.success.light, fg: brand.success.dark },
  CANCELLED:  { bg: brand.error.light,   fg: brand.error.dark },
};

export default function TransfersListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listWarehouses().then(setWarehouses).catch(() => {}); }, [user?.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTransfers({ page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, user?.tenantId]);

  const whName = useMemo(() => {
    const m = new Map<string, string>();
    warehouses.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [warehouses]);

  const columns: Column<Transfer>[] = [
    {
      key: 'ref', label: 'Ref',
      render: (t) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>{t.ref}</Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{new Date(t.date).toLocaleDateString()}</Typography>
        </Stack>
      ),
    },
    {
      key: 'route', label: 'Route',
      render: (t) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2">{whName.get(t.fromWarehouseId) || t.fromWarehouseId.slice(0, 8)}</Typography>
          <IconArrowRight size={14} color={brand.primary[500]} />
          <Typography variant="body2">{whName.get(t.toWarehouseId) || t.toWarehouseId.slice(0, 8)}</Typography>
        </Stack>
      ),
    },
    { key: 'lines', label: 'Lines', align: 'right', render: (t) => t.lines.length },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (t) => {
        const tone = TONE[t.status];
        return <Chip label={t.status.replace(/_/g, ' ')} size="small" sx={{ bgcolor: tone.bg, color: tone.fg, fontWeight: 600, borderRadius: '6px' }} />;
      },
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader title="Transfers" subtitle="Stock moves between warehouses" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTable
        columns={columns} rows={rows} loading={loading}
        emptyText="No transfers yet."
        page={page} totalPages={totalPages} onPageChange={setPage}
        getRowKey={(t) => t.id}
        tableKey="transfers"
        enableColumnVisibility
        enableExport
        exportFileName="transfers"
        toolbarTitle="Stock movements"
      />
    </Box>
  );
}
