import { useMemo, useState } from 'react';
import { Alert, Box, Chip, Drawer, IconButton, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { IconEye, IconFileInvoice } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listCreditors, generateDebtDocument, type CreditorSummary } from 'src/api/smartpos/debt';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import MetricCard from 'src/components/smartpos/MetricCard';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { useDynamicBrand } from 'src/theme/smartpos/dynamicBrand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

function CreditorDetailDrawer({ creditor, open, onClose }: { creditor: CreditorSummary | null; open: boolean; onClose: () => void }) {
  const brand = useDynamicBrand();
  if (!creditor) return null;
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, p: 3 } }}>
      <Typography variant="h6" gutterBottom>{creditor.supplierName}</Typography>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Outstanding</Typography>
          <Typography variant="body2" fontWeight={600} color={brand.warning.main}>{fmt(creditor.outstanding)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Purchase Orders</Typography>
          <Typography variant="body2">{creditor.purchaseCount}</Typography>
        </Box>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Aging Breakdown</Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {creditor.current > 0 && <Chip label={`0-30: ${fmt(creditor.current)}`} size="small" variant="outlined" color="success" />}
          {creditor.days30to60 > 0 && <Chip label={`31-60: ${fmt(creditor.days30to60)}`} size="small" variant="outlined" color="warning" />}
          {creditor.days60to90 > 0 && <Chip label={`61-90: ${fmt(creditor.days60to90)}`} size="small" variant="outlined" color="error" />}
          {creditor.days90plus > 0 && <Chip label={`90+: ${fmt(creditor.days90plus)}`} size="small" color="error" />}
        </Stack>
      </Stack>
    </Drawer>
  );
}

export default function CreditorsPage() {
  const brand = useDynamicBrand();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCreditor, setSelectedCreditor] = useState<CreditorSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: creditors, isLoading, error } = useQuery({
    queryKey: ['creditors', search],
    queryFn: () => listCreditors({ search: search || undefined }),
    staleTime: 15_000,
  });

  const columns = useMemo((): Column<CreditorSummary>[] => [
    { key: 'supplierName', label: 'Supplier', render: (row) => <Typography variant="body2" fontWeight={500}>{row.supplierName}</Typography> },
    { key: 'outstanding', label: 'Outstanding', sortable: true, render: (row) => <Typography variant="body2" fontWeight={600} color={brand.warning.main}>{fmt(row.outstanding)}</Typography> },
    { key: 'aging', label: 'Aging', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          {row.current > 0 && <Chip label={`0-30: ${fmt(row.current)}`} size="small" variant="outlined" color="success" sx={{ fontSize: 10 }} />}
          {row.days60to90 > 0 && <Chip label={`61-90: ${fmt(row.days60to90)}`} size="small" variant="outlined" color="error" sx={{ fontSize: 10 }} />}
          {row.days90plus > 0 && <Chip label={`90+: ${fmt(row.days90plus)}`} size="small" color="error" sx={{ fontSize: 10 }} />}
        </Stack>),
    },
    { key: 'orders', label: 'Orders', render: (row) => <Typography variant="body2">{row.purchaseCount}</Typography> },
    { key: 'actions', label: 'Actions', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Details"><IconButton size="small" onClick={() => { setSelectedCreditor(row); setDrawerOpen(true); }}><IconEye size={18} /></IconButton></Tooltip>
          <Tooltip title="Generate Statement"><IconButton size="small" onClick={async () => {
            try {
              const doc = await generateDebtDocument({ documentType: 'supplier-statement', referenceType: 'purchase', referenceId: row.supplierId });
              alert(`Statement: ${doc.documentNumber}`);
              queryClient.invalidateQueries({ queryKey: ['creditors'] });
            } catch (err) {
              console.error('Failed to generate supplier statement:', err);
              alert(`Failed: ${(err as Error).message}`);
            }
          }}><IconFileInvoice size={18} /></IconButton></Tooltip>
        </Stack>),
    },
  ], [queryClient]);

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load creditors: {(error as Error).message}</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Creditors (AP)" subtitle="Suppliers with outstanding balances" />
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <MetricCard label="Total Outstanding" value={fmt(creditors?.reduce((s, c) => s + c.outstanding, 0) || 0)} icon={<IconEye size={24} />} />
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search creditors..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280 }} />
      </Stack>
      {isLoading ? <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        : creditors && creditors.length > 0 ? <DataTable columns={columns} rows={creditors} />
        : <EmptyStateGuide title="No Creditors" subtitle="All supplier balances are paid." icon={<IconEye size={48} />} />}
      <CreditorDetailDrawer creditor={selectedCreditor} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
