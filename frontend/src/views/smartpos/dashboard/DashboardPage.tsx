import { useEffect, useMemo, useRef, useState, useContext, useCallback } from 'react';
import { Alert, Box, Button, Grid, LinearProgress, Typography } from '@mui/material';
import { useSearchParams, Link } from 'react-router';

import {
  getDashboard,
  getPaymentMethodMix,
  getForecast,
  type Dashboard,
  type Forecast,
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
import { usePolling } from 'src/hooks/usePolling';
import OnboardingBanner from './OnboardingBanner';
import CelebrationModal from 'src/views/smartpos/onboarding/CelebrationModal';

import DashboardGreetingBar, { loadLayout, type SectionKey } from './GreetingBar';
import DashboardSkeleton from './Skeleton';
import BusinessPulseCard from './BusinessPulseCard';
import KpiGrid from './KpiGrid';
import RevenueChart from './RevenueChart';
import PaymentMixCard from './PaymentMixCard';
import RecentTransactions from './RecentTransactions';
import FinancialHealth from './FinancialHealth';
import OperationsOverview from './OperationsOverview';
import DashboardSideRail from './SideRail';
import AnomalyAlerts from './AnomalyAlerts';
import GoalProgress from './GoalProgress';
import TopPerformers from './TopPerformers';

import {
  seriesOrFallback,
  trend,
  formatDateRange,
  periodRange,
  PERIODS,
  previousPeriod,
  computeDelta,
  profitMargin,
} from './utils';

export default function DashboardPage() {
  const { user, tenants, isTrialing, getTrialDaysLeft } = useAuth();
  const { state: onboardingState } = useOnboarding();
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const [showCelebration, setShowCelebration] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Dashboard | null>(null);
  const [previousData, setPreviousData] = useState<Dashboard | null>(null);
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
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(() =>
    loadLayout(user?.tenantId ?? ''),
  );
  const loadedRef = useRef(false);

  useEffect(() => {
    if (onboardingState.isComplete) {
      setShowCelebration(true);
    }
  }, [onboardingState.isComplete]);

  // Listen for layout changes from GreetingBar's customize dialog
  useEffect(() => {
    const handler = (e: Event) => {
      setVisibleSections(e instanceof CustomEvent ? e.detail : new Set());
    };
    window.addEventListener('dashboard:layout-changed', handler);
    return () => window.removeEventListener('dashboard:layout-changed', handler);
  }, []);

  // Re-read layout when tenantId changes
  useEffect(() => {
    if (user?.tenantId) {
      setVisibleSections(loadLayout(user.tenantId));
    }
  }, [user?.tenantId]);

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
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user?.tenantId) return;

    const isInitialLoad = !loadedRef.current;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    setSectionError(null);
    setPaymentMixUnavailable(false);

    const range = periodRange(period);
    const prev = previousPeriod(period);

    try {
      const results = await Promise.allSettled([
        getDashboard({ period, warehouseId: warehouseId || undefined }),
        prev
          ? getDashboard({ period: prev, warehouseId: warehouseId || undefined })
          : Promise.resolve(null),
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
        getForecast({ period, warehouseId: warehouseId || undefined, days: 30 }),
      ]);

      if (results[0].status === 'rejected') {
        throw results[0].reason;
      }

      setData(results[0].value);
      setPreviousData(
        results[1].status === 'fulfilled' ? results[1].value : null,
      );
      setPaymentMix(
        results[2].status === 'fulfilled' ? results[2].value : [],
      );
      setPaymentMixUnavailable(results[2].status === 'rejected');
      setRecentSales(
        results[3].status === 'fulfilled' ? results[3].value.content : [],
      );

      if (results[4].status === 'fulfilled') {
        setExpiringBatchesCount(results[4].value.length);
        setExpiringUnitsAtRisk(
          results[4].value.reduce((sum, b) => sum + b.onHand, 0),
        );
      } else {
        setExpiringBatchesCount(0);
        setExpiringUnitsAtRisk(0);
      }

      if (results[5].status === 'fulfilled') {
        setForecast(results[5].value);
      } else {
        setForecast(null);
      }

      const failedSections = [
        results[3].status === 'rejected' ? 'recent sales' : null,
      ].filter(Boolean);
      setSectionError(
        failedSections.length
          ? `Live ${failedSections.join(' and ')} could not be loaded.`
          : null,
      );

      loadedRef.current = true;
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      if (!loadedRef.current) {
        setLoading(false);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [period, warehouseId, user?.tenantId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 60 seconds
  usePolling(fetchDashboardData, 60000);

  const handleManualRefresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const salesSeries = useMemo(() => seriesOrFallback(data), [data]);
  const previousSalesSeries = useMemo(
    () => seriesOrFallback(previousData),
    [previousData],
  );
  const revenueTrend = useMemo(() => trend(salesSeries), [salesSeries]);
  const orderSeries = useMemo(
    () => data?.salesSeries?.map((row) => row.count) ?? [],
    [data],
  );
  const dateRangeLabel = useMemo(
    () => formatDateRange(data?.from, data?.to),
    [data],
  );
  const paymentTotal = useMemo(
    () => paymentMix.reduce((sum, row) => sum + row.total, 0),
    [paymentMix],
  );

  // --- Deltas ---
  const cashDelta = useMemo(
    () => computeDelta(data?.payments.totalIn ?? 0, previousData?.payments.totalIn ?? 0),
    [data, previousData],
  );
  const salesDelta = useMemo(
    () => computeDelta(data?.sales.net ?? 0, previousData?.sales.net ?? 0),
    [data, previousData],
  );
  const ordersDelta = useMemo(
    () => computeDelta(data?.sales.count ?? 0, previousData?.sales.count ?? 0),
    [data, previousData],
  );
  const purchasesKpiDelta = useMemo(
    () => computeDelta(data?.purchases.gross ?? 0, previousData?.purchases.gross ?? 0),
    [data, previousData],
  );
  const profitDelta = useMemo(
    () => computeDelta(data?.netProfit ?? 0, previousData?.netProfit ?? 0),
    [data, previousData],
  );
  const expensesDelta = useMemo(
    () => computeDelta(data?.expenses.total ?? 0, previousData?.expenses.total ?? 0),
    [data, previousData],
  );
  const profitMarginDelta = useMemo(
    () => computeDelta(profitMargin(data), profitMargin(previousData)),
    [data, previousData],
  );
  const salesDueDelta = useMemo(
    () => computeDelta(data?.sales.due ?? 0, previousData?.sales.due ?? 0),
    [data, previousData],
  );
  const financialPurchasesDelta = useMemo(
    () => computeDelta(data?.purchases.gross ?? 0, previousData?.purchases.gross ?? 0),
    [data, previousData],
  );
  const inventoryValueDelta = useMemo(
    () => computeDelta(data?.inventory.totalOnHand ?? 0, previousData?.inventory.totalOnHand ?? 0),
    [data, previousData],
  );
  const stockAtRiskDelta = useMemo(
    () => computeDelta(data?.inventory.lowStockLines ?? 0, previousData?.inventory.lowStockLines ?? 0),
    [data, previousData],
  );
  const totalSkusDelta = useMemo(
    () => computeDelta(data?.inventory.distinctProducts ?? 0, previousData?.inventory.distinctProducts ?? 0),
    [data, previousData],
  );
  const stockMovementDelta = useMemo(
    () => computeDelta(data?.inventory.totalAvailable ?? 0, previousData?.inventory.totalAvailable ?? 0),
    [data, previousData],
  );

  const showSection = (key: SectionKey) => visibleSections.has(key);

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
        lastUpdated={lastUpdated}
        onRefresh={handleManualRefresh}
      />

      <OnboardingBanner />

      {/* Trial / Plan Banner */}
      {isTrialing() && (
        <Alert
          severity="info"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" component={Link} to="/smartpos/billing">
              Subscribe Now
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            {getTrialDaysLeft() !== null && getTrialDaysLeft()! > 0
              ? `${getTrialDaysLeft()} days left in your free trial.`
              : 'Your trial is ending soon.'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            You're on the {tenants[0]?.billingPlan ?? 'STARTER'} plan. Subscribe to keep your data and unlock all features.
          </Typography>
        </Alert>
      )}

      {tenants[0]?.billingPlan === 'FREE' && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          You're on the Free plan with limited features.{' '}
          <Link to="/smartpos/billing">Upgrade now</Link> to unlock accounting, reports, and more.
        </Alert>
      )}

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

      {refreshing && (
        <LinearProgress sx={{ mb: 2, borderRadius: '4px', height: 3 }} />
      )}

      {loading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 12, xl: 9 }}>
              {/* KPI Grid */}
              {showSection('kpiGrid') && (
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
                    sx={{
                      flexWrap: { xs: 'nowrap', lg: 'wrap' },
                      mx: 0,
                      width: { xs: 'max-content', lg: '100%' },
                    }}
                  >
                    <Grid
                      size={{ xs: 12, lg: 4 }}
                      sx={{
                        minWidth: { xs: 280, lg: 'auto' },
                        scrollSnapAlign: 'start',
                      }}
                    >
                      <BusinessPulseCard
                        data={data}
                        salesSeries={salesSeries}
                        period={period}
                        delta={profitDelta}
                      />
                    </Grid>
                    <KpiGrid
                      data={data}
                      salesSeries={salesSeries}
                      revenueTrend={revenueTrend}
                      orderSeries={orderSeries}
                      cashDelta={cashDelta}
                      salesDelta={salesDelta}
                      ordersDelta={ordersDelta}
                      purchasesDelta={purchasesKpiDelta}
                    />
                  </Grid>
                </Box>
              )}

              {/* Revenue Chart + Recent Transactions */}
              {(showSection('revenueChart') || showSection('recentTransactions')) && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  {showSection('revenueChart') && (
                    <Grid size={{ xs: 12, lg: showSection('recentTransactions') ? 8 : 12 }}>
                      <RevenueChart
                        salesSeries={salesSeries}
                        period={period}
                        isDark={isDark}
                        data={data}
                        previousSalesSeries={
                          previousSalesSeries.length ? previousSalesSeries : undefined
                        }
                        forecast={forecast}
                      />
                    </Grid>
                  )}
                  {showSection('recentTransactions') && (
                    <Grid size={{ xs: 12, lg: showSection('revenueChart') ? 4 : 12 }}>
                      <RecentTransactions rows={recentSales} />
                    </Grid>
                  )}
                </Grid>
              )}

              {/* Top Performers */}
              {showSection('topPerformers') && (
                <Box sx={{ mb: 1.5 }}>
                  <TopPerformers
                    period={period}
                    warehouseId={warehouseId}
                    limit={5}
                  />
                </Box>
              )}

              {/* Financial Health + Operations Overview + Payment Mix */}
              {(showSection('financialHealth') || showSection('operationsOverview') || showSection('paymentMix')) && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  {showSection('financialHealth') && (
                    <Grid size={{ xs: 12, lg: 4 }}>
                      <FinancialHealth
                        data={data}
                        expensesDelta={expensesDelta}
                        profitMarginDelta={profitMarginDelta}
                        salesDueDelta={salesDueDelta}
                        purchasesDelta={financialPurchasesDelta}
                      />
                    </Grid>
                  )}
                  {showSection('operationsOverview') && (
                    <Grid size={{ xs: 12, lg: 3 }}>
                      <OperationsOverview
                        data={data}
                        inventoryValueDelta={inventoryValueDelta}
                        stockAtRiskDelta={stockAtRiskDelta}
                        totalSkusDelta={totalSkusDelta}
                        stockMovementDelta={stockMovementDelta}
                      />
                    </Grid>
                  )}
                  {showSection('paymentMix') && (
                    <Grid size={{ xs: 12, lg: 5 }}>
                      <PaymentMixCard
                        paymentMix={paymentMix}
                        paymentMixUnavailable={paymentMixUnavailable}
                        isDark={isDark}
                      />
                    </Grid>
                  )}
                </Grid>
              )}

              {/* Goal Progress */}
              {showSection('goalProgress') && (
                <Box sx={{ mb: 1.5 }}>
                  <GoalProgress
                    currentRevenue={data?.sales.net ?? 0}
                    currentOrders={data?.sales.count ?? 0}
                    currentMargin={profitMargin(data)}
                    tenantId={user?.tenantId ?? ''}
                  />
                </Box>
              )}
            </Grid>

            {/* SideRail + Anomaly Alerts */}
            {showSection('sideRail') && (
              <Grid size={{ xs: 12, xl: 3 }}>
                <DashboardSideRail
                  data={data}
                  revenueTrend={revenueTrend}
                  isDark={isDark}
                  paymentTotal={paymentTotal}
                  expiringBatchesCount={expiringBatchesCount}
                  expiringUnitsAtRisk={expiringUnitsAtRisk}
                  anomalySlot={
                    <Box sx={{ mb: 1.5 }}>
                      <AnomalyAlerts warehouseId={warehouseId} />
                    </Box>
                  }
                />
              </Grid>
            )}
          </Grid>
        </>
      )}

      <CelebrationModal
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
    </Box>
  );
}
