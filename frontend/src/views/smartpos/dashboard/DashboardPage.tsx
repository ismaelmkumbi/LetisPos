import { useEffect, useMemo, useRef, useState, useContext, useCallback } from 'react';
import { Alert, Box, Button, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useSearchParams, Link } from 'react-router';

import {
  getDashboard,
  getPaymentMethodMix,
  getForecast,
  getArAging,
  type Dashboard,
  type Forecast,
  type PaymentMethodMixRow,
  type Period,
  type ArAging,
} from 'src/api/smartpos/reports';
import { listSales, type Sale } from 'src/api/smartpos/sales';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { getExpiringBatches } from 'src/api/smartpos/batches';
import { getDemandForecast, getReorderRecommendations, getProfitOpportunities, getCustomerRetention, getCashFlowForecast, type DemandForecast, type ReorderRecommendations, type ProfitOpportunities, type CustomerRetention, type CashFlowForecast } from 'src/api/smartpos/dashboardIntelligence';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { CustomizerContext } from 'src/context/CustomizerContext';
import type { UUID } from 'src/api/smartpos/types';
import { usePolling } from 'src/hooks/usePolling';
import { authTheme as at } from 'src/theme/smartpos/authTheme';
import { brand } from 'src/theme/smartpos/brand';
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
import DemandForecastCard from './DemandForecastCard';
import ReorderRecommendationsCard from './ReorderRecommendationsCard';
import ProfitOpportunitiesCard from './ProfitOpportunitiesCard';
import CustomerRetentionCard from './CustomerRetentionCard';
import CashFlowForecastCard from './CashFlowForecastCard';

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
  const [arAging, setArAging] = useState<ArAging | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(() =>
    loadLayout(user?.tenantId ?? ''),
  );
  const loadedRef = useRef(false);

  const [demandForecast, setDemandForecast] = useState<DemandForecast | null>(null);
  const [reorderRecs, setReorderRecs] = useState<ReorderRecommendations | null>(null);
  const [profitOpps, setProfitOpps] = useState<ProfitOpportunities | null>(null);
  const [demandLoading, setDemandLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [profitLoading, setProfitLoading] = useState(false);
  const [customerRetention, setCustomerRetention] = useState<CustomerRetention | null>(null);
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowForecast | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);

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
    if (!user?.tenantId) {
      setLoading(false);
      return;
    }

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
        getArAging(),
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
        results[3].status === 'fulfilled' ? (results[3].value?.content ?? []) : [],
      );

      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) {
        setExpiringBatchesCount(results[4].value.length);
        setExpiringUnitsAtRisk(
          results[4].value.reduce((sum, b) => sum + (b?.onHand ?? 0), 0),
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

      if (results[6]?.status === 'fulfilled') setArAging(results[6].value);

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

  const fetchIntelligenceModules = useCallback(async () => {
    if (!user?.tenantId) return;
    const wid = warehouseId || undefined;

    // Fire all 5 in parallel, each non-blocking
    setDemandLoading(true);
    setReorderLoading(true);
    setProfitLoading(true);
    setRetentionLoading(true);
    setCashFlowLoading(true);

    try {
      const resp = await getDemandForecast(7, wid);
      if (resp.data) setDemandForecast(resp.data);
    } catch { /* silent */ }
    finally { setDemandLoading(false); }

    try {
      const resp = await getReorderRecommendations(wid);
      if (resp.data) setReorderRecs(resp.data);
    } catch { /* silent */ }
    finally { setReorderLoading(false); }

    try {
      const resp = await getProfitOpportunities(wid);
      if (resp.data) setProfitOpps(resp.data);
    } catch { /* silent */ }
    finally { setProfitLoading(false); }

    try {
      const resp = await getCustomerRetention();
      if (resp.data) setCustomerRetention(resp.data);
    } catch { /* silent */ }
    finally { setRetentionLoading(false); }

    try {
      const resp = await getCashFlowForecast(30);
      if (resp.data) setCashFlowForecast(resp.data);
    } catch { /* silent */ }
    finally { setCashFlowLoading(false); }
  }, [user?.tenantId, warehouseId]);

  useEffect(() => {
    fetchIntelligenceModules();
  }, [fetchIntelligenceModules]);

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

  // Derive at-risk customer stats from the retention API response
  const atRiskStats = useMemo(() => {
    if (!customerRetention?.atRiskCustomers) return { count: 0, revenue: 0 };
    return {
      count: customerRetention.atRiskCustomers.length,
      revenue: customerRetention.totalAtRiskRevenue,
    };
  }, [customerRetention]);

  const showSection = (key: SectionKey) => visibleSections.has(key);
  const rightColumnVisible =
    showSection('sideRail')
    || showSection('paymentMix')
    || showSection('goalProgress')
    || showSection('profitOpportunities')
    || showSection('reorderRecommendations')
    || showSection('cashFlowForecast')
    || showSection('recentTransactions');

  return (
    <Box sx={{ pb: { xs: 'calc(96px + env(safe-area-inset-bottom, 0px))', md: 1 } }}>
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

      {/* Tiered trial messaging */}
      {isTrialing() && (() => {
        const daysLeft = getTrialDaysLeft();
        if (daysLeft === null) return null;
        if (daysLeft > 21) return null; // Days 1-21: no urgency
        if (daysLeft > 7) {
          // Days 22-27: gentle reminder
          return (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: at.radius.md,
                ...(isDark && {
                  bgcolor: 'rgba(59,130,246,0.14)',
                  color: brand.neutral[100],
                  border: '1px solid rgba(59,130,246,0.28)',
                  '& .MuiAlert-icon': { color: brand.info.main },
                }),
              }}
              action={
                <Button color="inherit" size="small" component={Link} to="/smartpos/billing">
                  Subscribe Now
                </Button>
              }
            >
              <Typography variant="body2" fontWeight={600}>
                {daysLeft} days left in your free trial.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subscribe to keep your data and unlock all features on the {tenants[0]?.billingPlan ?? 'STARTER'} plan.
              </Typography>
            </Alert>
          );
        }
        // Days 28-30: urgency
        return (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: at.radius.md,
              ...(isDark && {
                bgcolor: 'rgba(245,158,11,0.16)',
                color: brand.neutral[100],
                border: '1px solid rgba(245,158,11,0.30)',
                '& .MuiAlert-icon': { color: brand.warning.main },
              }),
            }}
            action={
              <Button color="inherit" size="small" component={Link} to="/smartpos/billing">
                Subscribe Now
              </Button>
            }
          >
            <Typography variant="body2" fontWeight={600}>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left — subscribe now to avoid interruption.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your {tenants[0]?.billingPlan ?? 'STARTER'} plan trial is ending soon. Your data will be preserved.
            </Typography>
          </Alert>
        );
      })()}

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

      {user && !user.tenantId ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', maxWidth: 480, mx: 'auto' }}>
            The operational dashboard is for tenant users. As a super admin, use the Tenant 360 hub to manage all tenants and monitor platform health.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/smartpos/admin/tenants"
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Go to Tenant 360
          </Button>
        </Box>
      ) : loading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 12, xl: rightColumnVisible ? 9 : 12 }}>
              {/* KPI Grid */}
              {showSection('kpiGrid') && (
                <Box
                  sx={{
                    mb: 1.5,
                    overflow: 'visible',
                  }}
                >
                  <Grid
                    container
                    spacing={1.5}
                    sx={{
                      mx: 0,
                      width: '100%',
                    }}
                  >
                    <Grid
                      size={{ xs: 12, lg: 4 }}
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
                    />
                  </Grid>
                </Box>
              )}

              {/* ── ROW 2: Revenue chart ── */}
              {showSection('revenueChart') && (
                <Box sx={{ mb: 1.5 }}>
                  <RevenueChart
                    salesSeries={salesSeries}
                    orderSeries={orderSeries}
                    period={period}
                    isDark={isDark}
                    data={data}
                    previousSalesSeries={
                      previousSalesSeries?.length ? previousSalesSeries : undefined
                    }
                    forecast={forecast}
                  />
                </Box>
              )}

              {/* ── ROW 3: Financial Health + Operations ── */}
              {(showSection('financialHealth') || showSection('operationsOverview')) && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  {showSection('financialHealth') && (
                    <Grid size={{ xs: 12, lg: showSection('operationsOverview') ? 6 : 12 }}>
                      <FinancialHealth
                        data={data}
                        expensesDelta={expensesDelta}
                        profitMarginDelta={profitMarginDelta}
                        salesDueDelta={salesDueDelta}
                        purchasesDelta={financialPurchasesDelta}
                        arAging={arAging}
                      />
                    </Grid>
                  )}
                  {showSection('operationsOverview') && (
                    <Grid size={{ xs: 12, lg: showSection('financialHealth') ? 6 : 12 }}>
                      <OperationsOverview
                        data={data}
                        inventoryValueDelta={inventoryValueDelta}
                        stockAtRiskDelta={stockAtRiskDelta}
                        totalSkusDelta={totalSkusDelta}
                        stockMovementDelta={stockMovementDelta}
                      />
                    </Grid>
                  )}
                </Grid>
              )}

              {/* ── ROW 4: Demand Forecast — full width (ProfitOpps moved to rail) ── */}
              {showSection('demandForecast') && (
                <Box sx={{ mb: 1.5 }}>
                  <DemandForecastCard
                    data={demandForecast}
                    loading={demandLoading}
                    isDark={isDark}
                  />
                </Box>
              )}

              {/* ── ROW 5: Customer Retention ── */}
              {showSection('customerRetention') && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  <Grid size={{ xs: 12 }}>
                    <CustomerRetentionCard
                      data={customerRetention}
                      loading={retentionLoading}
                      isDark={isDark}
                    />
                  </Grid>
                </Grid>
              )}

              {/* ── Bottom: Top Performers ── */}
              {showSection('topPerformers') && (
                <Box sx={{ mb: 1.5 }}>
                  <TopPerformers period={period} warehouseId={warehouseId} limit={5} />
                </Box>
              )}

            </Grid>

            {rightColumnVisible && (
              <Grid size={{ xs: 12, xl: 3 }}>
                {/* Right rail: compact decision cards first, expandable lists lower. */}
                <Stack
                  spacing={1.5}
                  sx={{
                    pb: 2,
                  }}
                >
                  {showSection('sideRail') && (
                    <DashboardSideRail
                      data={data}
                      revenueTrend={revenueTrend}
                      isDark={isDark}
                      paymentTotal={paymentTotal}
                      expiringBatchesCount={expiringBatchesCount}
                      expiringUnitsAtRisk={expiringUnitsAtRisk}
                      atRiskCustomerCount={atRiskStats.count}
                      atRiskRevenue={atRiskStats.revenue}
                      anomalySlot={
                        <AnomalyAlerts warehouseId={warehouseId} />
                      }
                    />
                  )}

                  {showSection('paymentMix') && (
                    <PaymentMixCard
                      paymentMix={paymentMix}
                      paymentMixUnavailable={paymentMixUnavailable}
                      isDark={isDark}
                      layout="rail"
                    />
                  )}

                  {showSection('cashFlowForecast') && (
                    <CashFlowForecastCard data={cashFlowForecast} loading={cashFlowLoading} isDark={isDark} />
                  )}

                  {showSection('goalProgress') && (
                    <GoalProgress
                      currentRevenue={data?.sales.net ?? 0}
                      currentOrders={data?.sales.count ?? 0}
                      currentMargin={profitMargin(data)}
                      tenantId={user?.tenantId ?? ''}
                    />
                  )}

                  {showSection('profitOpportunities') && (
                    <ProfitOpportunitiesCard data={profitOpps} loading={profitLoading} isDark={isDark} />
                  )}

                  {showSection('reorderRecommendations') && (
                    <ReorderRecommendationsCard data={reorderRecs} loading={reorderLoading} isDark={isDark} />
                  )}

                  {showSection('recentTransactions') && (
                    <RecentTransactions rows={recentSales} />
                  )}
                </Stack>
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
