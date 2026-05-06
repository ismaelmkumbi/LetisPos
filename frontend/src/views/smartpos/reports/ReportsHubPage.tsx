import { Box, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { IconChartBar, IconReceipt, IconPackage, IconPercentage, IconShoppingCart, IconCoin, IconUsers, IconChartInfographic, IconDownload } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const REPORTS = [
  { title: 'Sales Report', description: 'Revenue trends, top products, customers, and category breakdown', icon: IconChartBar, to: '/smartpos/reports/sales', color: brand.primary[600], soft: brand.primary[50] },
  { title: 'Profit & Loss', description: 'Revenue, COGS, gross profit, expenses, and net profit', icon: IconReceipt, to: '/smartpos/reports/profit-loss', color: brand.info.main, soft: brand.info.light },
  { title: 'Inventory Report', description: 'Stock levels, valuation, low stock alerts, and dead stock', icon: IconPackage, to: '/smartpos/reports/inventory', color: brand.success.main, soft: brand.success.light },
  { title: 'Tax Report', description: 'Tax collected by rate, category, and period', icon: IconPercentage, to: '/smartpos/reports/tax', color: brand.warning.main, soft: brand.warning.light },
  { title: 'Purchase Report', description: 'Purchase orders, spending, and supplier analysis', icon: IconShoppingCart, to: '/smartpos/reports/purchases', color: brand.purple.main, soft: brand.purple.light },
  { title: 'Payment Report', description: 'Cash flow, payment methods, and outstanding', icon: IconCoin, to: '/smartpos/reports/payments', color: brand.success.main, soft: brand.success.light },
  { title: 'Customer Report', description: 'Customer spend, frequency, and retention', icon: IconUsers, to: '/smartpos/reports/customers', color: brand.info.main, soft: brand.info.light },
  { title: 'Advanced Reports', description: 'Warranty, dead stock, inventory valuation, sales by dimension', icon: IconChartInfographic, to: '/smartpos/reports/advanced', color: brand.accent[500], soft: brand.accent[50] },
  { title: 'Async Exports', description: 'Export reports to PDF, Excel, or CSV with background processing', icon: IconDownload, to: '/smartpos/reports/exports', color: brand.neutral[600], soft: brand.neutral[100] },
];

export default function ReportsHubPage() {
  return (
    <Box>
      <PageHeader title="Reports" subtitle="Explore and export business intelligence across all dimensions" />
      <Grid container spacing={2}>
        {REPORTS.map((r) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.to}>
            <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%', transition: 'transform 0.15s ease, box-shadow 0.15s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' } }}>
              <CardActionArea component={RouterLink} to={r.to} sx={{ height: '100%', p: 0 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: r.soft, color: r.color, display: 'grid', placeItems: 'center', mb: 1.5 }}>
                    <r.icon size={22} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: brand.neutral[900], mb: 0.5 }}>{r.title}</Typography>
                  <Typography sx={{ color: brand.neutral[500], fontSize: 13, lineHeight: 1.4 }}>{r.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
