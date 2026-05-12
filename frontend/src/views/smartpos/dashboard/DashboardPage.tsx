import { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { Alert, Box, Grid, LinearProgress } from '@mui/material';
import { useSearchParams } from 'react-router';

import {
  getDashboard,
  getPaymentMethodMix,
  type Dashboard,
  type PaymentMethodMixRow,
  type Period,
} from 'src/api/smartpos/reports';
import { listSales, type Sale } from 'src/api/smartpos/sales';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { getExpiringBatches } from 'src/api/smartpos/batches';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { CustomizerContext } from 'src/context/CustomizerContext';
import type { UUID } from 'src/api/smartpos/types';
import OnboardingBanner from './OnboardingBanner';
import CelebrationModal from 'src/views/smartpos/onboarding/CelebrationModal';

import DashboardGreetingBar from './GreetingBar';
import DashboardSkeleton from './Skeleton';
import BusinessPulseCard from './BusinessPulseCard';
import KpiGrid from './KpiGrid';
import RevenueChart from './RevenueChart';
import PaymentMixCard from './PaymentMixCard';
import RecentTransactions from './RecentTransactions';
import FinancialHealth from './FinancialHealth';
import OperationsOverview from './OperationsOverview';
import DashboardSideRail from './SideRail';

import {
  seriesOrFallback,
  trend,
  formatDateRange,
  periodRange,
  PERIODS,
} from './utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [paymentMix, setPaymentMix] = useState<PaymentMethodMixRow[]>([]);
  const [paymentMixUnavailable, setPaymentMixUnavailable] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [expiringBatchesCount, setExpiringBatchesCount] = useState(0);
  const [expiringUnitsAtRisk, setExpiringUnitsAtRisk] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (onboardingState.isComplete) {
      setShowCelebration(true);
    }
  }, [onboardingState.isComplete]);

  // Read initial values from URL, default to MONTH / all warehouses
  const initPeriod = searchParams.get('period') as Period | null;
  const [period, setPeriod] = useState<Period>(
    initPeriod && PERIODS.includes(initPeriod) ? initPeriod : 'MONTH',
  );
  const [warehouseId, setWarehouseId] = useState<UUID | ''>(
    (searchParams.get('warehouseId') ?? '') as UUID | '',
  );

  useEffect(() => {
    listWarehouses()
      .then((rows) => setWarehouses(rows.filter((r) => r.active)))
      .catch(() => setWarehouses([]));
  }, [user?.tenantId]);

  const setFilter = (key: 'period' | 'warehouseId', value: string) => {
    if (key === 'period') setPeriod(value as Period);
    else setWarehouseId(value as UUID | '');
    // Sync to URL for bookmarkability
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    if (loadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setSectionError(null);
    setPaymentMixUnavailable(false);
    const range = periodRange(period);
    Promise.allSettled([
      getDashboard({ period, warehouseId: warehouseId || undefined }),
      getPaymentMethodMix(range),
      listSales({
        ...range,
        warehouseId: warehouseId || undefined,
        status: 'CONFIRMED',
        page: 0,
        size: 5,
        sort: 'date,desc',
      }),
      getExpiringBatches({ withinDays: 30 }),
    ])
      .then(([dashboardResult, paymentMixResult, salesResult, expiringResult]) => {
        if (cancelled) return;
        if (dashboardResult.status === 'rejected') {
          throw dashboardResult.reason;
        }

        setData(dashboardResult.value);
        loadedRef.current = true;
        setPaymentMix(paymentMixResult.status === 'fulfilled' ? paymentMixResult.value : []);
        setPaymentMixUnavailable(paymentMixResult.status === 'rejected');
        setRecentSales(salesResult.status === 'fulfilled' ? salesResult.value.content : []);

        if (expiringResult.status === 'fulfilled') {
          setExpiringBatchesCount(expiringResult.value.length);
          setExpiringUnitsAtRisk(expiringResult.value.reduce((sum, b) => sum + b.onHand, 0));
        } else {
          setExpiringBatchesCount(0);
          setExpiringUnitsAtRisk(0);
        }

        const failedSections = [salesResult.status === 'rejected' ? 'recent sales' : null].filter(
          Boolean,
        );
        setSectionError(
          failedSections.length
            ? `Live ${failedSections.join(' and ')} could not be loaded.`
            : null,
        );
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, warehouseId, user?.tenantId]);

  const salesSeries = useMemo(() => seriesOrFallback(data), [data]);
  const revenueTrend = useMemo(() => trend(salesSeries), [salesSeries]);
  const orderSeries = useMemo(() => data?.salesSeries?.map((row) => row.count) ?? [], [data]);
  const dateRangeLabel = useMemo(() => formatDateRange(data?.from, data?.to), [data]);
  const paymentTotal = useMemo(
    () => paymentMix.reduce((sum, row) => sum + row.total, 0),
    [paymentMix],
  );

  return (
    <Box sx={{ pb: 1 }}>
      <DashboardGreetingBar
        period={period}
        warehouseId={warehouseId}
        warehouses={warehouses}
        dateRangeLabel={dateRangeLabel}
        isDark={isDark}
        onPeriodChange={(p) => setFilter('period', p)}
        onWarehouseChange={(id) => setFilter('warehouseId', id)}
      />

      <OnboardingBanner />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}
      {sectionError && !error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
          {sectionError}
        </Alert>
      )}

      {refreshing && <LinearProgress sx={{ mb: 2, borderRadius: '4px', height: 3 }} />}

      {loading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 12, xl: 9 }}>
              <Box
                sx={{
                  mb: 1.5,
                  mx: { xs: -1.5, sm: 0 },
                  px: { xs: 1.5, sm: 0 },
                  overflow: { xs: 'auto', lg: 'visible' },
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: { xs: 'x mandatory', lg: 'none' },
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}
              >
                <Grid
                  container
                  spacing={1.5}
                  sx={{ flexWrap: { xs: 'nowrap', lg: 'wrap' }, mx: 0, width: { xs: 'max-content', lg: '100%' } }}
                >
                  <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: { xs: 280, lg: 'auto' }, scrollSnapAlign: 'start' }}>
                    <BusinessPulseCard data={data} salesSeries={salesSeries} period={period} />
                  </Grid>
                  <KpiGrid
                    data={data}
                    salesSeries={salesSeries}
                    revenueTrend={revenueTrend}
                    orderSeries={orderSeries}
                  />
                </Grid>
              </Box>

              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <RevenueChart
                    salesSeries={salesSeries}
                    period={period}
                    isDark={isDark}
                    data={data}
                  />
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                  <RecentTransactions rows={recentSales} />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, lg: 4 }}>
                  <FinancialHealth data={data} />
                </Grid>
                <Grid size={{ xs: 12, lg: 3 }}>
                  <OperationsOverview data={data} />
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <PaymentMixCard
                    paymentMix={paymentMix}
                    paymentMixUnavailable={paymentMixUnavailable}
                    isDark={isDark}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, xl: 3 }}>
              <DashboardSideRail
                data={data}
                revenueTrend={revenueTrend}
                isDark={isDark}
                paymentTotal={paymentTotal}
                expiringBatchesCount={expiringBatchesCount}
                expiringUnitsAtRisk={expiringUnitsAtRisk}
              />
            </Grid>
          </Grid>
        </>
      )}

      <CelebrationModal open={showCelebration} onClose={() => setShowCelebration(false)} />
    </Box>
  );
}
