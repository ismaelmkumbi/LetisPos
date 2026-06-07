import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Drawer, IconButton, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { IconFileInvoice, IconCash, IconEye } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listDebtors, generateDebtDocument, type DebtorSummary } from 'src/api/smartpos/debt';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import MetricCard from 'src/components/smartpos/MetricCard';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { useDynamicBrand } from 'src/theme/smartpos/dynamicBrand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

function DebtorDetailDrawer({ debtor, open, onClose }: { debtor: DebtorSummary | null; open: boolean; onClose: () => void }) {
  const brand = useDynamicBrand();
  if (!debtor) return null;
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, p: 3 } }}>
      <Typography variant="h6" gutterBottom>{debtor.customerName}</Typography>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Outstanding</Typography>
          <Typography variant="body2" fontWeight={600} color={brand.error.main}>{fmt(debtor.outstanding)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Credit Limit</Typography>
          <Typography variant="body2">{fmt(debtor.creditLimit)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Available Credit</Typography>
          <Typography variant="body2" color={debtor.available > 0 ? brand.success.main : brand.error.main}>{fmt(debtor.available)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Invoices</Typography>
          <Typography variant="body2">{debtor.invoiceCount}</Typography>
        </Box>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Aging Breakdown</Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {debtor.current > 0 && <Chip label={`0-30: ${fmt(debtor.current)}`} size="small" variant="outlined" color="success" />}
          {debtor.days30to60 > 0 && <Chip label={`31-60: ${fmt(debtor.days30to60)}`} size="small" variant="outlined" color="warning" />}
          {debtor.days60to90 > 0 && <Chip label={`61-90: ${fmt(debtor.days60to90)}`} size="small" variant="outlined" color="error" />}
          {debtor.days90plus > 0 && <Chip label={`90+: ${fmt(debtor.days90plus)}`} size="small" color="error" />}
        </Stack>
        {debtor.phone && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Phone</Typography><Typography variant="body2">{debtor.phone}</Typography></Box>}
        {debtor.email && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Email</Typography><Typography variant="body2">{debtor.email}</Typography></Box>}
      </Stack>
    </Drawer>
  );
}

export default function DebtorsPage() {
  const brand = useDynamicBrand();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: debtors, isLoading, error } = useQuery({
    queryKey: ['debtors', search, overdueOnly],
    queryFn: () => listDebtors({ search: search || undefined, overdueOnly }),
    staleTime: 15_000,
  });

  const columns = useMemo((): Column<DebtorSummary>[] => [
    { key: 'customerName', label: 'Customer', render: (row) => <Typography variant="body2" fontWeight={500}>{row.customerName}</Typography> },
    { key: 'outstanding', label: 'Outstanding', sortable: true, render: (row) => <Typography variant="body2" fontWeight={600} color={brand.error.main}>{fmt(row.outstanding)}</Typography> },
    { key: 'aging', label: 'Aging', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          {row.current > 0 && <Chip label={`0-30: ${fmt(row.current)}`} size="small" variant="outlined" color="success" sx={{ fontSize: 10 }} />}
          {row.days60to90 > 0 && <Chip label={`61-90: ${fmt(row.days60to90)}`} size="small" variant="outlined" color="error" sx={{ fontSize: 10 }} />}
          {row.days90plus > 0 && <Chip label={`90+: ${fmt(row.days90plus)}`} size="small" color="error" sx={{ fontSize: 10 }} />}
        </Stack>),
    },
    { key: 'invoices', label: 'Invoices', render: (row) => <Typography variant="body2">{row.invoiceCount}</Typography> },
    { key: 'status', label: 'Status', render: (row) => (
        row.days60to90 > 0 || row.days90plus > 0 ? <Chip label="Overdue" size="small" color="error" />
        : row.overdue ? <Chip label="Due" size="small" color="warning" />
        : <Chip label="Current" size="small" color="success" />
    )},
    { key: 'actions', label: 'Actions', render: (row) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Details"><IconButton size="small" onClick={() => { setSelectedDebtor(row); setDrawerOpen(true); }}><IconEye size={18} /></IconButton></Tooltip>
          <Tooltip title="Record Payment"><IconButton size="small" onClick={() => { alert(`Record payment for ${row.customerName}`); }}><IconCash size={18} /></IconButton></Tooltip>
          <Tooltip title="Generate Statement"><IconButton size="small" onClick={async () => {
            try {
              const doc = await generateDebtDocument({ documentType: 'customer-statement', referenceType: 'sale', referenceId: row.customerId });
              alert(`Statement: ${doc.documentNumber}`);
              queryClient.invalidateQueries({ queryKey: ['debtors'] });
            } catch (err) {
              console.error('Failed to generate customer statement:', err);
              alert(`Failed: ${(err as Error).message}`);
            }
          }}><IconFileInvoice size={18} /></IconButton></Tooltip>
        </Stack>),
    },
  ], [queryClient, brand.error.main]);

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load debtors: {(error as Error).message}</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Debtors (AR)" subtitle="Customers with outstanding balances" />
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <MetricCard label="Total Outstanding" value={fmt(debtors?.reduce((s, d) => s + d.outstanding, 0) || 0)} icon={<IconCash size={24} />} />
        <MetricCard label="Overdue" value={fmt(debtors?.filter(d => d.overdue).reduce((s, d) => s + d.outstanding, 0) || 0)} icon={<IconCash size={24} />} />
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search debtors..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280 }} />
        <Button variant={overdueOnly ? 'contained' : 'outlined'} color={overdueOnly ? 'error' : 'inherit'} size="small" onClick={() => setOverdueOnly(!overdueOnly)}>{overdueOnly ? 'Overdue Only' : 'Show All'}</Button>
      </Stack>
      {isLoading ? <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        : debtors && debtors.length > 0 ? <DataTable columns={columns} rows={debtors} />
        : <EmptyStateGuide title="No Debtors" subtitle="All customers have paid their balances." icon={<IconCash size={48} />} />}
      <DebtorDetailDrawer debtor={selectedDebtor} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
