import { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { Alert, Box, Button, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useSearchParams, Link } from 'react-router';

import { type Period } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { CustomizerContext } from 'src/context/CustomizerContext';
import type { UUID } from 'src/api/smartpos/types';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardData, useDashboardIntelligence } from './hooks';
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
  PERIODS,
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
  const queryClient = useQueryClient();

  // Read initial values from URL, default to MONTH / all warehouses
  const initPeriod = searchParams.get('period') as Period | null;
  const [period, setPeriod] = useState<Period>(
    initPeriod && PERIODS.includes(initPeriod) ? initPeriod : 'MONTH',
  );
  const [warehouseId, setWarehouseId] = useState<UUID | ''>(
    (searchParams.get('warehouseId') ?? '') as UUID | '',
  );

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(() =>
    loadLayout(user?.tenantId ?? ''),
  );

  // React Query: caches dashboard data 30s, re-fetches in background
  const dash = useDashboardData(period, warehouseId || undefined, user?.tenantId);
  const intel = useDashboardIntelligence(warehouseId || undefined, user?.tenantId);

  // Derive values that were previously from separate state
  const data = dash.data;
  const previousData = dash.previousData;
  const loading = dash.isLoading;
  const refreshing = dash.isFetching && !dash.isLoading;
  const error: string | null = dash.isError ? (dash.error as Error)?.message ?? 'Failed to load dashboard' : null;
  const paymentMix = dash.paymentMix;
  const paymentMixUnavailable = dash.paymentMixUnavailable;
  const recentSales = dash.recentSales;
  const forecast = dash.forecast;
  const arAging = dash.arAging;
  const expiringBatchesCount = Array.isArray(dash.expiringBatches) ? dash.expiringBatches.length : 0;
  const expiringUnitsAtRisk = Array.isArray(dash.expiringBatches)
    ? dash.expiringBatches.reduce((sum: number, b: { onHand?: number }) => sum + (b?.onHand ?? 0), 0)
    : 0;
  const sectionError = dash.recentSales.length === 0 && !dash.isLoading
    ? 'Live recent sales could not be loaded.'
    : null;

  const demandForecast = intel.demandForecast.data ?? null;
  const reorderRecs = intel.reorderRecs.data ?? null;
  const profitOpps = intel.profitOpps.data ?? null;
  const customerRetention = intel.customerRetention.data ?? null;
  const cashFlowForecast = intel.cashFlowForecast.data ?? null;
  const demandLoading = intel.demandForecast.isLoading;
  const reorderLoading = intel.reorderRecs.isLoading;
  const profitLoading = intel.profitOpps.isLoading;
  const retentionLoading = intel.customerRetention.isLoading;
  const cashFlowLoading = intel.cashFlowForecast.isLoading;

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

  // Track last successful data arrival for the "last updated" timestamp
  useEffect(() => {
    if (data) setLastUpdated(Date.now());
  }, [data]);

  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

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
