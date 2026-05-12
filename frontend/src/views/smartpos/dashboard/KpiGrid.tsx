import { Grid } from '@mui/material';
import { IconBriefcase, IconShoppingCart, IconWallet } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { trend, trendLabel } from './utils';
import MetricCard from './MetricCard';
import type { Dashboard } from 'src/api/smartpos/reports';
import type { Trend } from './utils';

interface KpiGridProps {
  data: Dashboard | null;
  salesSeries: number[];
  revenueTrend: Trend | null;
  orderSeries: number[];
}

export default function KpiGrid({ data, salesSeries, revenueTrend, orderSeries }: KpiGridProps) {
  return (
    <>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 180, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Cash in Hand"
          value={formatMoney(data?.payments.totalIn ?? 0)}
          change={trendLabel(revenueTrend)}
          icon={<IconWallet size={20} />}
          color={brand.primary[600]}
          series={salesSeries}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 180, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Net Sales"
          value={formatMoney(data?.sales.net ?? 0)}
          change={trendLabel(revenueTrend)}
          icon={<IconBriefcase size={20} />}
          color={brand.info.main}
          series={salesSeries}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 180, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Orders"
          value={formatNumber(data?.sales.count ?? 0)}
          change={trendLabel(trend(orderSeries))}
          icon={<IconShoppingCart size={20} />}
          color={brand.warning.main}
          series={orderSeries}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 180, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Purchases"
          value={formatMoney(data?.purchases.gross ?? 0)}
          change={null}
          icon={<IconShoppingCart size={20} />}
          color={brand.primary[600]}
          series={[]}
        />
      </Grid>
    </>
  );
}
