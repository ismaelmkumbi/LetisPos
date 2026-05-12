/**
 * Customer Analytics — AI-powered customer segmentation and behavior insights.
 * Shows segment breakdown bars, stat cards, and top customers table.
 */
import { useState } from 'react';
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

interface CustomerSegment {
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
}

interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  visits: number;
  lastPurchase: string;
  segment: 'Loyal' | 'At Risk' | 'Lost' | 'New';
}

const SEGMENT_TONES: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  Loyal: 'success',
  'At Risk': 'warning',
  Lost: 'error',
  New: 'info',
};

const MOCK_SEGMENTS: CustomerSegment[] = [
  { label: 'Loyal', count: 342, percentage: 42, color: brand.success.main, bgColor: brand.success.light },
  { label: 'At Risk', count: 186, percentage: 23, color: brand.warning.main, bgColor: brand.warning.light },
  { label: 'Lost', count: 145, percentage: 18, color: brand.error.main, bgColor: brand.error.light },
  { label: 'New', count: 138, percentage: 17, color: brand.info.main, bgColor: brand.info.light },
];

const MOCK_TOP_CUSTOMERS: TopCustomer[] = [
  { id: '1', name: 'Jane Mwangi', totalSpent: 452000, visits: 48, lastPurchase: '2026-05-11', segment: 'Loyal' },
  { id: '2', name: 'David Ochieng', totalSpent: 387500, visits: 35, lastPurchase: '2026-05-10', segment: 'Loyal' },
  { id: '3', name: 'Sarah Kamau', totalSpent: 298000, visits: 22, lastPurchase: '2026-04-28', segment: 'At Risk' },
  { id: '4', name: 'Peter Njoroge', totalSpent: 245000, visits: 18, lastPurchase: '2026-05-09', segment: 'Loyal' },
  { id: '5', name: 'Mary Achieng', totalSpent: 182000, visits: 12, lastPurchase: '2026-03-15', segment: 'Lost' },
  { id: '6', name: 'John Mutua', totalSpent: 156000, visits: 8, lastPurchase: '2026-05-12', segment: 'New' },
  { id: '7', name: 'Grace Wanjiku', totalSpent: 134000, visits: 10, lastPurchase: '2026-04-05', segment: 'At Risk' },
  { id: '8', name: 'James Kariuki', totalSpent: 98000, visits: 5, lastPurchase: '2026-05-01', segment: 'New' },
];

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

  const loadData = () => {
    setLoading(true);
    setTimeout(() => {
      setLoaded(true);
      setLoading(false);
    }, 600);
  };

  // Load on first render
  useState(() => { loadData(); });

  const totalCustomers = MOCK_SEGMENTS.reduce((s, seg) => s + seg.count, 0);
  const repeatRate = 56;
  const avgOrder = 28500;
  const churnRisk = 18;

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
          {MOCK_SEGMENTS.map((seg) => (
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
          rows={MOCK_TOP_CUSTOMERS}
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
