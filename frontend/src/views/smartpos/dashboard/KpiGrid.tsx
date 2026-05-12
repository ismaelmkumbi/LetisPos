import { Grid } from '@mui/material';
import { IconBriefcase, IconShoppingCart, IconWallet } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { trend, trendLabel } from './utils';
import MetricCard from './MetricCard';
import type { Dashboard } from 'src/api/smartpos/reports';
import type { Trend, Delta } from './types';

interface KpiGridProps {
  data: Dashboard | null;
  salesSeries: number[];
  revenueTrend: Trend | null;
  orderSeries: number[];
  cashDelta?: Delta;
  salesDelta?: Delta;
  ordersDelta?: Delta;
  purchasesDelta?: Delta;
}

export default function KpiGrid({
  data,
  salesSeries,
  revenueTrend,
  orderSeries,
  cashDelta,
  salesDelta,
  ordersDelta,
  purchasesDelta,
}: KpiGridProps) {
  const navigate = useNavigate();

  return (
    <>
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 0, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Cash in Hand"
          value={formatMoney(data?.payments.totalIn ?? 0)}
          change={trendLabel(revenueTrend)}
          icon={<IconWallet size={20} />}
          color={brand.primary[600]}
          series={salesSeries}
          delta={cashDelta}
          onClick={() => navigate('/smartpos/accounts')}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 0, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Net Sales"
          value={formatMoney(data?.sales.net ?? 0)}
          change={trendLabel(revenueTrend)}
          icon={<IconBriefcase size={20} />}
          color={brand.info.main}
          series={salesSeries}
          delta={salesDelta}
          onClick={() => navigate('/smartpos/reports/sales')}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 0, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Orders"
          value={formatNumber(data?.sales.count ?? 0)}
          change={trendLabel(trend(orderSeries))}
          icon={<IconShoppingCart size={20} />}
          color={brand.warning.main}
          series={orderSeries}
          delta={ordersDelta}
          onClick={() => navigate('/smartpos/sales')}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: { xs: 0, lg: 'auto' }, scrollSnapAlign: 'start' }}>
        <MetricCard
          label="Purchases"
          value={formatMoney(data?.purchases.gross ?? 0)}
          change={null}
          icon={<IconShoppingCart size={20} />}
          color={brand.primary[600]}
          series={[]}
          delta={purchasesDelta}
          onClick={() => navigate('/smartpos/purchases')}
        />
      </Grid>
    </>
  );
}
