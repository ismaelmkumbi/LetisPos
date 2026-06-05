/**
 * KpiGrid — 4 metric cards in the KPI strip.
 *
 * Changes vs original:
 * - Replaced "Purchases" with "Avg. Order Value" (AOV).
 *   AOV = Net Sales ÷ Order Count. It's a far more actionable at-a-glance
 *   metric for retail; Purchases already appears in Financial Health.
 * - Passes a computed AOV series for the sparkline (derived from salesSeries)
 * - Uses IconReceipt for AOV, keeps existing icons for others
 */
import { Grid } from '@mui/material';
import { IconBriefcase, IconReceipt, IconShoppingCart, IconWallet } from '@tabler/icons-react';
import { useMemo, memo } from 'react';
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

const metricPalette = {
  collected: '#14B8A6',
  sales: brand.info.main,
  orders: brand.warning.main,
  aov: brand.purple.main,
} as const;

function KpiGrid({
  data,
  salesSeries,
  revenueTrend,
  orderSeries,
  cashDelta,
  salesDelta,
  ordersDelta,
}: KpiGridProps) {
  const navigate = useNavigate();

  // Average Order Value — computed from data
  const aov = useMemo(() => {
    const count = data?.sales.count ?? 0;
    const net   = data?.sales.net   ?? 0;
    return count > 0 ? net / count : 0;
  }, [data]);

  // Derive a synthetic AOV series from sales/orders series
  const aovSeries = useMemo(() => {
    if (!salesSeries.length || !orderSeries.length) return [];
    return salesSeries.map((s, i) =>
      orderSeries[i] ? Math.round(s / orderSeries[i]) : 0,
    );
  }, [salesSeries, orderSeries]);

  const aovTrend = useMemo(() => trend(aovSeries), [aovSeries]);

  return (
    <>
      {/* Collected Sales */}
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: 0 }}>
        <MetricCard
          label="Collected Sales"
          value={formatMoney(data?.sales.paid ?? data?.payments.totalIn ?? 0)}
          change={trendLabel(revenueTrend)}
          icon={<IconWallet size={20} />}
          color={metricPalette.collected}
          series={salesSeries}
          delta={cashDelta}
          onClick={() => navigate('/smartpos/accounts')}
        />
      </Grid>

      {/* Net Sales */}
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: 0 }}>
        <MetricCard
          label="Net Sales"
          value={formatMoney(data?.sales.net ?? 0)}
          change={trendLabel(revenueTrend)}
          icon={<IconBriefcase size={20} />}
          color={metricPalette.sales}
          series={salesSeries}
          delta={salesDelta}
          onClick={() => navigate('/smartpos/reports/sales')}
        />
      </Grid>

      {/* Orders */}
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: 0 }}>
        <MetricCard
          label="Orders"
          value={formatNumber(data?.sales.count ?? 0)}
          change={trendLabel(trend(orderSeries))}
          icon={<IconShoppingCart size={20} />}
          color={metricPalette.orders}
          series={orderSeries}
          delta={ordersDelta}
          onClick={() => navigate('/smartpos/sales')}
        />
      </Grid>

      {/* Avg. Order Value (replaces Purchases — which lives in Financial Health) */}
      <Grid size={{ xs: 6, sm: 6, lg: 2 }} sx={{ minWidth: 0 }}>
        <MetricCard
          label="Avg. Order Value"
          value={formatMoney(aov)}
          change={trendLabel(aovTrend)}
          icon={<IconReceipt size={20} />}
          color={metricPalette.aov}
          series={aovSeries}
          onClick={() => navigate('/smartpos/reports/sales')}
        />
      </Grid>
    </>
  );
}

export default memo(KpiGrid);
