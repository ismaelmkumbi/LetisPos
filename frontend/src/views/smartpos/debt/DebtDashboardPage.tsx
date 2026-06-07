import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { IconUsers, IconTruckDelivery, IconAlertTriangle, IconCash } from '@tabler/icons-react';
import { getDebtDashboard, type DebtDashboard } from 'src/api/smartpos/debt';
import MetricCard from 'src/components/smartpos/MetricCard';
import PageHeader from 'src/components/smartpos/PageHeader';
import { useDynamicBrand } from 'src/theme/smartpos/dynamicBrand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { useNavigate } from 'react-router';
import AgingChart from './components/AgingChart';

const fmt = formatMoney;

function SummaryCards({ data }: { data: DebtDashboard }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flex: '1 1 220px', minWidth: 200 }}>
        <MetricCard label="Total AR (Debtors)" value={fmt(data.totalAR)} icon={<IconUsers size={24} />} />
      </Box>
      <Box sx={{ flex: '1 1 220px', minWidth: 200 }}>
        <MetricCard label="Total AP (Creditors)" value={fmt(data.totalAP)} icon={<IconTruckDelivery size={24} />} />
      </Box>
      <Box sx={{ flex: '1 1 220px', minWidth: 200 }}>
        <MetricCard label="Net Position" value={fmt(data.totalAR - data.totalAP)} icon={<IconCash size={24} />} />
      </Box>
      <Box sx={{ flex: '1 1 220px', minWidth: 200 }}>
        <MetricCard label="Overdue Alerts" value={String(data.overdueAlerts.length)} icon={<IconAlertTriangle size={24} />} />
      </Box>
    </Box>
  );
}

function AgingComparison({ data }: { data: DebtDashboard }) {
  if (!data.agingAR?.length && !data.agingAP?.length) {
    return <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}><Typography variant="h6" gutterBottom>AR vs AP Aging</Typography><Typography color="text.secondary">No aging data available</Typography></Box>;
  }
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>AR vs AP Aging</Typography>
      <AgingChart arAging={data.agingAR} apAging={data.agingAP} />
    </Box>
  );
}

function TopListCard({ title, items, type }: { title: string; items: Array<{ name: string; amount: number }>; type: 'debtor' | 'creditor' }) {
  const nav = useNavigate();
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      {items.length === 0 && <Typography color="text.secondary" variant="body2">None</Typography>}
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 1, bgcolor: 'action.hover', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
            onClick={() => nav(type === 'debtor' ? '/smartpos/debt/debtors' : '/smartpos/debt/creditors')}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">#{i + 1}</Typography>
              <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function OverdueAlertsCard({ alerts }: { alerts: DebtDashboard['overdueAlerts'] }) {
  const brand = useDynamicBrand();
  const nav = useNavigate();
  if (alerts.length === 0) return null;
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <IconAlertTriangle size={20} color={brand.error.main} />
        <Typography variant="h6">Overdue Alerts</Typography>
      </Stack>
      <Stack spacing={1.5}>
        {alerts.slice(0, 5).map((alert, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 1, bgcolor: 'action.hover', cursor: 'pointer', borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? brand.error.main : brand.warning.main}` }}
            onClick={() => nav('/smartpos/debt/debtors')}>
            <Box><Typography variant="body2" fontWeight={600}>{alert.customerName}</Typography>
              <Chip label={`${alert.daysOverdue}+ days overdue`} size="small" color={alert.severity === 'CRITICAL' ? 'error' : 'warning'} sx={{ mt: 0.5, height: 20, fontSize: 11 }} /></Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function DebtDashboardPage() {
  const brand = useDynamicBrand();
  const { data, isLoading, error } = useQuery({ queryKey: ['debt-dashboard'], queryFn: getDebtDashboard, staleTime: 30_000 });

  if (isLoading) return <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 2 }} /><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load dashboard: {(error as Error).message}</Alert></Box>;
  if (!data) return null;

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Debt Dashboard" subtitle="Accounts receivable & payable overview" />
      <Box sx={{ mt: 3 }}><SummaryCards data={data} /></Box>
      <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 600px' }}><AgingComparison data={data} /></Box>
        <Box sx={{ flex: '1 1 350px' }}>
          <OverdueAlertsCard alerts={data.overdueAlerts} />
          {data.recentCollections.length > 0 && (
            <Box sx={{ mt: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>Recent Collections</Typography>
              <Stack spacing={1}>
                {data.recentCollections.slice(0, 6).map((c, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                    <Stack spacing={0.5}><Typography variant="body2" fontWeight={500}>{c.customerName}</Typography><Typography variant="caption" color="text.secondary">{new Date(c.date).toLocaleDateString()}</Typography></Stack>
                    <Typography variant="body2" fontWeight={600} color={brand.success.main}>+{fmt(c.amount)}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 400px' }}><TopListCard title="Top Debtors" items={data.topDebtors.map(d => ({ name: d.customerName, amount: d.outstanding }))} type="debtor" /></Box>
        <Box sx={{ flex: '1 1 400px' }}><TopListCard title="Top Creditors" items={data.topCreditors.map(c => ({ name: c.supplierName, amount: c.outstanding }))} type="creditor" /></Box>
      </Box>
    </Box>
  );
}
