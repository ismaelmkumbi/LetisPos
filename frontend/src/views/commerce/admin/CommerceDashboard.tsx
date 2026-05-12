import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Button } from '@mui/material';
import {
  ShoppingCart as OrderIcon,
  AttachMoney as RevenueIcon,
  TrendingUp as AovIcon,
  Percent as ConversionIcon,
} from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { CommerceSummary, TopProduct } from '../../../types/commerce';

const MetricCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ bgcolor: color + '15', borderRadius: 2, p: 1.5, display: 'flex' }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h5" fontWeight="bold">{value}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const CommerceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<CommerceSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      commerceAdmin.getAnalyticsSummary('30d'),
      commerceAdmin.getTopProducts('30d'),
    ])
      .then(([s, tp]) => { setSummary(s); setTopProducts(tp); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Box p={3}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>{error}</Alert></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Commerce Dashboard</Typography>

      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Online Orders" value={summary?.totalOrders?.toString() || '0'}
            icon={<OrderIcon sx={{ color: '#1976d2' }} />} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Revenue" value={`$${(summary?.totalRevenue || 0).toFixed(2)}`}
            icon={<RevenueIcon sx={{ color: '#388e3c' }} />} color="#388e3c" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Avg Order Value" value={`$${(summary?.averageOrderValue || 0).toFixed(2)}`}
            icon={<AovIcon sx={{ color: '#f57c00' }} />} color="#f57c00" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard title="Conversion Rate" value={`${(summary?.conversionRate || 0).toFixed(1)}%`}
            icon={<ConversionIcon sx={{ color: '#7b1fa2' }} />} color="#7b1fa2" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Top Products</Typography>
          {topProducts.length === 0 ? (
            <Typography color="text.secondary">No sales data yet.</Typography>
          ) : (
            topProducts.slice(0, 10).map((p, i) => (
              <Box key={p.productId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                <Typography>
                  <Typography component="span" color="text.secondary" mr={1}>#{i + 1}</Typography>
                  {p.productName || p.productId}
                </Typography>
                <Typography fontWeight="bold">${p.totalRevenue?.toFixed(2)}</Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CommerceDashboard;
