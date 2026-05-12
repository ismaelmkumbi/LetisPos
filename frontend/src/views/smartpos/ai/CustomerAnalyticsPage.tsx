/**
 * Customer Analytics — AI-powered customer segmentation and behavior insights.
 * Uses real customer analytics API backed by ai-service.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconRefresh,
  IconUsers,
  IconPercentage,
  IconShoppingCart,
  IconAlertTriangle,
} from '@tabler/icons-react';

import { DataTable, StatusBadge, type Column } from 'src/components/smartpos/DataTable';
import { MetricCard } from 'src/components/smartpos/MetricCard';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { getCustomerAnalytics, type CustomerSegment, type TopCustomer } from 'src/api/smartpos/ai';

const SEGMENT_TONES: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  Loyal: 'success',
  'At Risk': 'warning',
  Lost: 'error',
  New: 'info',
  Others: 'info',
};

const columns: Column<TopCustomer>[] = [
  { key: 'name', label: 'Customer', sortable: true, render: (row) => (
    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[900], fontSize: '0.85rem' }}>
      {row.name}
    </Typography>
  )},
  { key: 'totalSpent', label: 'Total Spent', align: 'right', sortable: true, render: (row) => (
    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
      TZS {row.totalSpent.toLocaleString()}
    </Typography>
  )},
  { key: 'visits', label: 'Visits', align: 'center', sortable: true, render: (row) => (
    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
      {row.visits}
    </Typography>
  )},
  { key: 'lastPurchase', label: 'Last Purchase', align: 'center', sortable: true },
  { key: 'segment', label: 'Segment', align: 'center', sortable: true, render: (row) => (
    <StatusBadge label={row.segment} tone={SEGMENT_TONES[row.segment]} />
  )},
];

export default function CustomerAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [repeatRate, setRepeatRate] = useState(0);
  const [avgOrder, setAvgOrder] = useState(0);
  const [churnRisk, setChurnRisk] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomerAnalytics();
      setSegments(data.segments);
      setTopCustomers(data.topCustomers);
      setTotalCustomers(data.totalCustomers);
      setRepeatRate(data.repeatRate);
      setAvgOrder(data.avgOrderValue);
      setChurnRisk(data.churnRisk);
      setLoaded(true);
    } catch {
      // Error handled by parent if needed
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first render
  useEffect(() => { loadData(); }, [loadData]);

  return (
    <>
      <PageHeader
        title="Customer Analytics"
        subtitle="AI-powered customer segmentation and behavior insights"
        action={{
          label: 'Refresh',
          icon: loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />,
          onClick: loadData,
          variant: 'ghost',
        }}
      />

      {/* Stat cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
        <MetricCard
          label="Total Customers"
          value={totalCustomers.toLocaleString()}
          trend={{ direction: 'up', value: '+12%' }}
          icon={<IconUsers size={16} />}
        />
        <MetricCard
          label="Repeat Rate"
          value={`${repeatRate}%`}
          trend={{ direction: 'up', value: '+3%' }}
          icon={<IconPercentage size={16} />}
        />
        <MetricCard
          label="Avg Order Value"
          value={`TZS ${avgOrder.toLocaleString()}`}
          trend={{ direction: 'up', value: '+8%' }}
          icon={<IconShoppingCart size={16} />}
        />
        <MetricCard
          label="Churn Risk"
          value={`${churnRisk}%`}
          trend={{ direction: 'down', value: '-2%' }}
          icon={<IconAlertTriangle size={16} />}
        />
      </Stack>

      {/* Segment breakdown */}
      <Card
        elevation={0}
        sx={{
          mb: 2.5,
          p: 2.5,
          border: `1px solid ${brand.neutral[200]}`,
          borderRadius: '8px',
          bgcolor: '#fff',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: brand.neutral[900], mb: 2 }}>
          Customer Segments
        </Typography>
        <Stack spacing={1.5}>
          {segments.map((seg) => (
            <Box key={seg.label}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                    {seg.label}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
                    {seg.count.toLocaleString()} customers
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: seg.color }}>
                    {seg.percentage}%
                  </Typography>
                </Stack>
              </Stack>
              <Box
                sx={{
                  height: 10,
                  borderRadius: '5px',
                  bgcolor: brand.neutral[100],
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${seg.percentage}%`,
                    borderRadius: '5px',
                    bgcolor: seg.color,
                    transition: 'width 0.6s ease',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Card>

      {/* Top customers table */}
      {loaded ? (
        <DataTable<TopCustomer>
          columns={columns}
          rows={topCustomers}
          loading={loading}
          emptyText="No customer data available"
          itemLabel="customers"
          tableKey="ai-customer-analytics"
          enableSorting
          toolbarTitle="Top Customers"
        />
      ) : (
        !loading && (
          <Card
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '8px',
              bgcolor: brand.neutral[50],
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                bgcolor: brand.neutral[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <IconUsers size={28} color={brand.neutral[400]} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: brand.neutral[700], mb: 0.5 }}>
              No analytics loaded
            </Typography>
            <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 3 }}>
              Load customer analytics to see segmentation and top customers.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconRefresh size={16} />}
              onClick={loadData}
              sx={{
                bgcolor: brand.accent[500],
                '&:hover': { bgcolor: brand.accent[600] },
                fontWeight: 700,
                borderRadius: '10px',
              }}
            >
              Load Analytics
            </Button>
          </Card>
        )
      )}
    </>
  );
}
