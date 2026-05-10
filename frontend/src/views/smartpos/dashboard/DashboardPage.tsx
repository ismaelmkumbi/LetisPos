import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconBriefcase,
  IconCalendar,
  IconChevronRight,
  IconCircleCheck,
  IconDotsVertical,
  IconInfoCircle,
  IconShoppingCart,
  IconWallet,
  IconWalletOff,
  IconX,
} from '@tabler/icons-react';
import { Link as RouterLink, useSearchParams } from 'react-router';

import {
  getDashboard,
  getPaymentMethodMix,
  type Dashboard,
  type PaymentMethodMixRow,
  type Period,
} from 'src/api/smartpos/reports';
import { listSales, type Sale } from 'src/api/smartpos/sales';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext } from 'react';
import type { UUID } from 'src/api/smartpos/types';
import OnboardingBanner from './OnboardingBanner';
import CelebrationModal from 'src/views/smartpos/onboarding/CelebrationModal';

const PERIODS: Period[] = ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'LAST_30_DAYS', 'YTD'];
const chartFont = 'Inter, DM Sans, sans-serif';

const PERIOD_LABELS: Record<Period, string> = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  WEEK: 'This week',
  MONTH: 'This month',
  LAST_30_DAYS: 'Last 30 d',
  YTD: 'Year to date',
};

function greeting(firstName?: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const wave = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
  return { salutation, wave, name: firstName ?? 'there' };
}

function formatDateRange(from?: string, to?: string) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (from && to) return `${fmt(new Date(from))} - ${fmt(new Date(to))}`;
  const date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${fmt(start)} - ${fmt(end)}`;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function periodRange(period: Period) {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (period === 'YESTERDAY') {
    start.setDate(today.getDate() - 1);
    end.setDate(today.getDate() - 1);
  } else if (period === 'WEEK') {
    const day = today.getDay() || 7;
    start.setDate(today.getDate() - day + 1);
  } else if (period === 'MONTH') {
    start.setDate(1);
  } else if (period === 'YTD') {
    start.setMonth(0, 1);
  } else if (period === 'LAST_30_DAYS') {
    start.setDate(today.getDate() - 30);
  }

  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

interface GreetingBarProps {
  period: Period;
  warehouseId: string;
  warehouses: Warehouse[];
  dateRangeLabel: string;
  isDark: boolean;
  onPeriodChange: (p: Period) => void;
  onWarehouseChange: (id: string) => void;
}

function DashboardGreetingBar({
  period,
  warehouseId,
  warehouses,
  dateRangeLabel,
  isDark,
  onPeriodChange,
  onWarehouseChange,
}: GreetingBarProps) {
  const { user } = useAuth();
  const { salutation, wave, name } = greeting(user?.firstName);

  const pillSx = (active: boolean) => ({
    height: { xs: 32, sm: 34 },
    px: { xs: 1.2, sm: 1.6 },
    borderRadius: '8px',
    fontSize: { xs: 12, sm: 13 },
    fontWeight: active ? 700 : 500,
    textTransform: 'none' as const,
    bgcolor: active ? brand.primary[600] : 'transparent',
    color: active ? '#fff' : brand.neutral[600],
    border: 'none',
    boxShadow: active ? `0 4px 12px -4px ${brand.primary[600]}88` : 'none',
    minWidth: 0,
    flexShrink: 0,
    '&:hover': {
      bgcolor: active ? brand.primary[700] : brand.neutral[100],
      color: active ? '#fff' : brand.neutral[800],
    },
    transition: 'all 0.15s ease',
  });

  return (
    <Box
      sx={{
        mb: 1.5,
        p: { xs: 1.75, md: 2 },
        borderRadius: '12px',
        border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        bgcolor: isDark ? brand.neutral[800] : '#FFFFFF',
        boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 1.5,
      }}
    >
      {/* Greeting */}
      <Box sx={{ flex: '0 0 auto' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: 19, md: 21 },
              color: brand.neutral[900],
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {salutation}, {name}
          </Typography>
          <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>
            {wave}
          </Box>
        </Stack>
        <Typography sx={{ color: brand.neutral[500], fontSize: 13, mt: 0.3 }}>
          Here's what's happening with your business today.
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Controls */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        useFlexGap
        sx={{
          width: { xs: '100%', md: 'auto' },
          maxWidth: '100%',
          flex: { md: '1 1 620px' },
          flexWrap: 'wrap',
          justifyContent: { xs: 'flex-start', md: 'flex-end' },
        }}
      >
        {/* Period pills */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            p: 0.5,
            borderRadius: '10px',
            bgcolor: isDark ? brand.neutral[900] : brand.neutral[50],
            border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            maxWidth: { xs: '100%', sm: 460, xl: 'none' },
          }}
        >
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="small"
              variant="text"
              onClick={() => onPeriodChange(p)}
              sx={pillSx(period === p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </Box>

        {/* Warehouse selector */}
        {warehouses.length > 0 && (
          <TextField
            select
            size="small"
            value={warehouseId}
            onChange={(e) => onWarehouseChange(e.target.value)}
            sx={{
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                height: 38,
                borderRadius: '9px',
                fontWeight: 600,
                fontSize: 13.5,
                '& fieldset': { borderColor: isDark ? brand.neutral[700] : brand.neutral[200] },
                '&:hover fieldset': { borderColor: brand.primary[300] },
                '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
              },
            }}
          >
            <MenuItem value="">All warehouses</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Date range display */}
        <Button
          variant="outlined"
          startIcon={<IconCalendar size={15} stroke={1.8} />}
          sx={{
            height: 38,
            px: 1.6,
            maxWidth: { xs: '100%', sm: 220 },
            borderRadius: '9px',
            borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
            color: brand.neutral[700],
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            bgcolor: isDark ? brand.neutral[800] : '#fff',
            '&:hover': {
              borderColor: brand.primary[300],
              bgcolor: isDark ? brand.primary[900] : brand.primary[50],
              color: brand.primary[700],
            },
          }}
        >
          {dateRangeLabel}
        </Button>
      </Stack>
    </Box>
  );
}

const cardSx = (isDark: boolean) => ({
  border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
  borderRadius: '12px',
  bgcolor: isDark ? brand.neutral[800] : '#FFFFFF',
  boxShadow: isDark ? 'none' : '0 18px 40px rgba(15,23,42,0.045)',
}) as const;

const muted = (isDark: boolean) => isDark ? brand.neutral[400] : brand.neutral[500];
const titleColor = brand.neutral[900];

function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `TSh ${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TSh ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `TSh ${(value / 1_000).toFixed(0)}K`;
  return formatMoney(value);
}

type Trend = { positive: boolean; value: number };

function trend(series: number[]): Trend | null {
  if (series.length < 2 || !series[0]) return null;
  const value = ((series[series.length - 1] - series[0]) / Math.abs(series[0])) * 100;
  return { positive: value >= 0, value: Math.abs(value) };
}

function trendLabel(current: Trend | null) {
  if (!current) return null;
  return `${current.positive ? 'Up' : 'Down'} ${current.value.toFixed(1)}%`;
}

function methodLabel(method: string) {
  return method
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function seriesOrFallback(data?: Dashboard | null) {
  const values = data?.salesSeries?.map((row) => row.net) ?? [];
  return values;
}

function sparkOptions(color: string): ApexOptions {
  return {
    chart: {
      type: 'area',
      sparkline: { enabled: true },
      toolbar: { show: false },
      fontFamily: chartFont,
    },
    colors: [color],
    stroke: { curve: 'smooth', width: 2.2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 90] } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v) => formatMoney(v) } },
  };
}

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
    ])
      .then(([dashboardResult, paymentMixResult, salesResult]) => {
        if (cancelled) return;
        if (dashboardResult.status === 'rejected') {
          throw dashboardResult.reason;
        }

        setData(dashboardResult.value);
        loadedRef.current = true;
        setPaymentMix(paymentMixResult.status === 'fulfilled' ? paymentMixResult.value : []);
        setPaymentMixUnavailable(paymentMixResult.status === 'rejected');
        setRecentSales(salesResult.status === 'fulfilled' ? salesResult.value.content : []);

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

  const businessOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'line',
        toolbar: { show: false },
        fontFamily: chartFont,
        zoom: { enabled: false },
      },
      colors: [brand.primary[600]],
      stroke: { curve: 'smooth', width: 2.6 },
      dataLabels: { enabled: false },
      grid: {
        borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
        strokeDashArray: 0,
        padding: { left: 8, right: 12 },
      },
      markers: { size: 4, hover: { size: 6 }, strokeWidth: 3 },
      xaxis: {
        categories: data?.salesSeries?.map((row) => row.date) ?? [],
        labels: { style: { colors: muted(isDark), fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { formatter: (v) => moneyShort(v), style: { colors: muted(isDark), fontSize: '11px' } },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '12px',
        markers: { size: 6, strokeWidth: 0 },
      },
      tooltip: { y: { formatter: (v) => formatMoney(v) } },
    }),
    [data, isDark],
  );

  const paymentSeries = paymentMix.map((row) => row.total);
  const paymentTotal = paymentSeries.reduce((sum, value) => sum + value, 0);
  const paymentLabels = paymentMix.map((row) => methodLabel(row.method));
  const paymentColors = [
    brand.primary[600],
    brand.info.main,
    brand.warning.main,
    brand.purple.main,
    brand.error.main,
    brand.neutral[500],
  ];

  const paymentOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: chartFont },
    colors: paymentColors,
    labels: paymentLabels,
    dataLabels: { enabled: false },
    stroke: { width: 4, colors: ['#FFFFFF'] },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => moneyShort(paymentTotal),
              fontSize: '20px',
              fontWeight: 800,
              color: titleColor,
            },
            value: { show: false },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => formatMoney(v) } },
  };

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
                </Grid>
              </Box>

              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
              <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
                        Business Overview
                      </Typography>
                      <Stack direction="row" spacing={2.5} sx={{ mt: 1 }}>
                        <Legend color={brand.primary[600]} label="Revenue" />
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label={PERIOD_LABELS[period]}
                        size="small"
                        sx={{
                          bgcolor: isDark ? brand.primary[900] : brand.primary[50],
                          color: brand.primary[700],
                          fontWeight: 700,
                        }}
                      />
                      <IconButton size="small">
                        <IconDotsVertical size={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                  {salesSeries.length ? (
                      <Chart
                        options={businessOptions}
                        series={[{ name: 'Revenue', data: salesSeries }]}
                        type="line"
                        height={240}
                      />
                    ) : (
                      <EmptyPanel
                        title="No sales trend yet"
                        subtitle="Confirmed sales will appear here as soon as they are recorded."
                        height={240}
                      />
                    )}
                  </CardContent>
                </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                  <RecentTransactions rows={recentSales} />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, lg: 4 }}>
              <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1.5 }}>
                    Financial Health
                  </Typography>
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat
                        label="Expenses"
                        value={formatMoney(data?.expenses.total ?? 0)}
                        tone="error"
                        icon={<IconWalletOff size={19} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat
                        label="Profit Margin"
                        value={`${profitMargin(data).toFixed(1)}%`}
                        tone={profitMargin(data) >= 0 ? 'success' : 'error'}
                        icon={<IconAlertTriangle size={19} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat
                        label="Sales Due"
                        value={formatMoney(data?.sales.due ?? 0)}
                        tone="warning"
                        icon={<IconX size={19} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat
                        label="Purchases"
                        value={formatMoney(data?.purchases.gross ?? 0)}
                        tone="success"
                        icon={<IconShoppingCart size={19} />}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 3 }}>
              <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1.5 }}>
                    Operations Overview
                  </Typography>
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat
                        label="Inventory Value"
                        value={formatNumber(data?.inventory.totalOnHand ?? 0)}
                        tone="info"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat
                        label="Stock at Risk"
                        value={`${formatNumber(data?.inventory.lowStockLines ?? 0)} Items`}
                        tone="warning"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat
                        label="Total SKUs"
                        value={formatNumber(data?.inventory.distinctProducts ?? 0)}
                        tone="purple"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat
                        label="Stock Movement"
                        value={formatNumber(data?.inventory.totalAvailable ?? 0)}
                        tone="success"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
              <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
                      Payment Mix
                    </Typography>
                    <Typography
                      component={RouterLink}
                      to="/smartpos/reports"
                      sx={{ color: brand.primary[600], fontWeight: 700, fontSize: 13 }}
                    >
                      View report
                    </Typography>
                  </Stack>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 5 }}>
                      {paymentSeries.length ? (
                        <Chart
                          options={paymentOptions}
                          series={paymentSeries}
                          type="donut"
                          height={198}
                        />
                      ) : (
                        <EmptyPanel
                          title={
                            paymentMixUnavailable ? 'Payment mix unavailable' : 'No payments yet'
                          }
                          subtitle={
                            paymentMixUnavailable
                              ? 'The dashboard will keep the rest of your live data available.'
                              : 'Completed payments will build this mix.'
                          }
                          height={198}
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 7 }}>
                      <Stack spacing={1.35}>
                        {paymentMix.map((row, index) => {
                          const label = methodLabel(row.method);
                          const color = paymentColors[index % paymentColors.length];
                          return (
                            <PaymentRow
                              key={label}
                              label={label}
                              value={row.total}
                              color={color}
                              total={paymentTotal || 1}
                            />
                          );
                        })}
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
                </Grid>
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, xl: 3 }}>
              <DashboardSideRail
                data={data}
                revenueTrend={revenueTrend}
                isDark={isDark}
                paymentTotal={paymentTotal}
              />
            </Grid>
          </Grid>
        </>
      )}

      <CelebrationModal open={showCelebration} onClose={() => setShowCelebration(false)} />
    </Box>
  );
}

function BusinessPulseCard({
  data,
  salesSeries,
  period,
}: {
  data: Dashboard | null;
  salesSeries: number[];
  period: Period;
}) {
  const { activeMode: _am } = useContext(CustomizerContext);
  const isDark = _am === 'dark';
  const loss = data ? Math.min(data.netProfit, 0) : 0;
  const options = sparkOptions(brand.error.main);
  const periodLabel = PERIOD_LABELS[period].toLowerCase();
  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx(isDark),
        minHeight: 204,
        background: isDark
          ? `linear-gradient(135deg, ${brand.neutral[800]} 0%, ${brand.neutral[900]} 58%, #1C0F0F 100%)`
          : 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 58%, #FEE2E2 100%)',
      }}
    >
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography
              sx={{ color: titleColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}
            >
              Business Pulse
            </Typography>
        <Typography sx={{ color: titleColor, fontSize: 16, fontWeight: 800, mt: 1.5 }}>
              {loss < 0
                ? `You are losing money ${periodLabel}`
                : `Your business is profitable ${periodLabel}`}
            </Typography>
            <Typography
              sx={{
                color: loss < 0 ? brand.error.main : brand.primary[600],
              fontSize: 26,
                fontWeight: 900,
                mt: 1.25,
              }}
            >
              {loss < 0 ? `-${formatMoney(Math.abs(loss))}` : formatMoney(data?.netProfit ?? 0)}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: brand.error.light,
              color: brand.error.main,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <IconWalletOff size={25} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
          {loss < 0 ? (
            <IconArrowDown size={15} color={brand.error.main} />
          ) : (
            <IconArrowUp size={15} color={brand.primary[600]} />
          )}
          <Typography
            sx={{
              color: loss < 0 ? brand.error.main : brand.primary[600],
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {data ? 'Live profit' : 'Waiting for data'}
          </Typography>
          <Typography sx={{ color: brand.neutral[600], fontSize: 13 }}>
            for selected period
          </Typography>
        </Stack>
        <Box sx={{ mt: 'auto', mx: -1 }}>
          {salesSeries.length ? (
            <Chart
              options={options}
              series={[{ name: 'Revenue', data: salesSeries }]}
              type="area"
              height={62}
            />
          ) : (
            <EmptyPanel
              title="No revenue trend"
              subtitle="Sales series will appear here."
              height={62}
              compact
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon,
  color,
  series,
}: {
  label: string;
  value: string;
  change: string | null;
  icon: React.ReactNode;
  color: string;
  series: number[];
}) {
  const { activeMode: _am2 } = useContext(CustomizerContext);
  const isDark = _am2 === 'dark';
  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), minHeight: 204 }}>
      <CardContent sx={{ p: 1.75, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: `${color}12`,
            color,
            display: 'grid',
            placeItems: 'center',
            mb: 1.25,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ color: titleColor, fontWeight: 700, fontSize: 13 }}>{label}</Typography>
        <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 20, mt: 0.75 }}>
          {value}
        </Typography>
        {change ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <IconArrowUp size={14} color={brand.primary[600]} />
            <Typography sx={{ color: brand.primary[600], fontWeight: 800, fontSize: 12 }}>
              {change}
            </Typography>
          </Stack>
        ) : (
          <Typography sx={{ color: muted(isDark), fontSize: 12, mt: 1 }}>Live total</Typography>
        )}
        <Typography sx={{ color: muted(isDark), fontSize: 12 }}>selected period</Typography>
        <Box sx={{ mt: 'auto', mx: -1, mb: -1 }}>
          {series.length ? (
            <Chart
              options={sparkOptions(color)}
              series={[{ name: label, data: series }]}
              type="area"
              height={46}
            />
          ) : (
            <EmptyPanel title="" subtitle="No series" height={46} compact />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function AlertStrip({
  tone,
  icon,
  title,
  subtitle,
  to,
}: {
  tone: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}) {
  const map = {
    success: { color: brand.primary[600], bg: '#F0FDF4', border: brand.primary[100] },
    warning: { color: brand.warning.main, bg: '#FFFBEB', border: brand.warning.light },
    error: { color: brand.error.main, bg: '#FEF2F2', border: brand.error.light },
  };
  const current = map[tone];
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${current.border}`,
        bgcolor: current.bg,
        height: '100%',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
          borderColor: current.color,
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{
          height: '100%',
          color: 'inherit',
          textAlign: 'left',
          '& .MuiCardActionArea-focusHighlight': { bgcolor: current.color },
        }}
      >
        <CardContent sx={{ p: 1.35, '&:last-child': { pb: 1.35 } }}>
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Box sx={{ color: current.color, display: 'grid', placeItems: 'center' }}>{icon}</Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: current.color, fontWeight: 800, fontSize: 13 }}>
                {title}
              </Typography>
              <Typography sx={{ color: brand.neutral[700], fontSize: 11.5, mt: 0.2 }}>
                {subtitle}
              </Typography>
            </Box>
            <IconChevronRight size={18} color={brand.neutral[700]} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function DashboardSideRail({
  data,
  revenueTrend,
  isDark,
  paymentTotal,
}: {
  data: Dashboard | null;
  revenueTrend: Trend | null;
  isDark: boolean;
  paymentTotal: number;
}) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        position: { xl: 'sticky' },
        top: { xl: 82 },
      }}
    >
      <Box>
        <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 15, mb: 1 }}>
          Today needs attention
        </Typography>
        <Stack spacing={1}>
          <AlertStrip
            tone="warning"
            icon={<IconAlertTriangle size={22} />}
            title={`${formatNumber(data?.inventory.lowStockLines ?? 0)} low-stock items`}
            subtitle="Review stock levels and restock decisions"
            to="/smartpos/stock"
          />
          <AlertStrip
            tone="error"
            icon={<IconInfoCircle size={22} />}
            title={
              data && data.netProfit < 0
                ? 'Profit is negative'
                : 'Review profit health'
            }
            subtitle="Compare sales, purchases, and expenses"
            to="/smartpos/reports"
          />
          <AlertStrip
            tone="success"
            icon={<IconCircleCheck size={22} />}
            title={
              revenueTrend
                ? `Sales ${revenueTrend.positive ? 'up' : 'down'} ${revenueTrend.value.toFixed(0)}%`
                : 'Sales trend pending'
            }
            subtitle={revenueTrend ? 'Open the sales report' : 'Record more sales to calculate movement'}
            to="/smartpos/reports"
          />
        </Stack>
      </Box>

      <Card elevation={0} sx={cardSx(isDark)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 15, mb: 1.25 }}>
            Quick actions
          </Typography>
          <Stack spacing={1}>
            <Button
              component={RouterLink}
              to="/smartpos/sales/new"
              variant="contained"
              fullWidth
              sx={{
                justifyContent: 'space-between',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                bgcolor: brand.primary[600],
                '&:hover': { bgcolor: brand.primary[700] },
              }}
              endIcon={<IconChevronRight size={17} />}
            >
              New sale
            </Button>
            <Button
              component={RouterLink}
              to="/smartpos/products"
              variant="outlined"
              fullWidth
              sx={{
                justifyContent: 'space-between',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
                color: titleColor,
              }}
              endIcon={<IconChevronRight size={17} />}
            >
              Manage stock
            </Button>
            <Button
              component={RouterLink}
              to="/smartpos/reports"
              variant="outlined"
              fullWidth
              sx={{
                justifyContent: 'space-between',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
                color: titleColor,
              }}
              endIcon={<IconChevronRight size={17} />}
            >
              View reports
            </Button>
          </Stack>

          <Box
            sx={{
              mt: 1.5,
              p: 1.25,
              borderRadius: '10px',
              bgcolor: isDark ? brand.neutral[900] : brand.neutral[50],
              border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
            }}
          >
            <Typography sx={{ color: muted(isDark), fontSize: 12, fontWeight: 700 }}>
              Payments captured
            </Typography>
            <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 20, mt: 0.25 }}>
              {formatMoney(paymentTotal)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

function RecentTransactions({ rows }: { rows: Sale[] }) {
  const { activeMode: _am3 } = useContext(CustomizerContext);
  const isDark = _am3 === 'dark';
  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
            Recent Transactions
          </Typography>
          <Typography
            component={RouterLink}
            to="/smartpos/sales"
            sx={{ color: brand.primary[600], fontWeight: 700, fontSize: 13 }}
          >
            View all
          </Typography>
        </Stack>
        {rows.length ? (
          <Stack spacing={1.35}>
            {rows.map((row, index) => (
              <Stack key={row.id} direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: index % 2 ? brand.info.light : brand.primary[50],
                    color: index % 2 ? brand.info.main : brand.primary[600],
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconBriefcase size={19} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ color: titleColor, fontWeight: 800, fontSize: 13 }}>
                    {row.ref}
                  </Typography>
                  <Typography noWrap sx={{ color: muted(isDark), fontSize: 12 }}>
                    {row.customerId ? 'Customer sale' : 'Walk-in sale'} - {row.paymentStatus}
                  </Typography>
                </Box>
                <Typography sx={{ color: muted(isDark), fontSize: 12 }}>
                  {formatSaleTime(row.date)}
                </Typography>
                <Typography
                  sx={{
                    color: brand.primary[600],
                    fontWeight: 900,
                    fontSize: 13,
                    minWidth: 88,
                    textAlign: 'right',
                  }}
                >
                  {formatMoney(row.grandTotal)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <EmptyPanel
            title="No recent sales"
            subtitle="Confirmed sales will appear here."
            height={180}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SmallStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'error' | 'info' | 'purple';
  icon?: React.ReactNode;
}) {
  const { activeMode: _s } = useContext(CustomizerContext);
  const isDark = _s === 'dark';
  const map = {
    success: { bg: brand.primary[50], color: brand.primary[600] },
    warning: { bg: brand.warning.light, color: brand.warning.main },
    error: { bg: brand.error.light, color: brand.error.main },
    info: { bg: brand.info.light, color: brand.info.main },
    purple: { bg: brand.purple.light, color: brand.purple.main },
  };
  const current = map[tone];
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '10px',
        border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        bgcolor: isDark ? brand.neutral[800] : '#fff',
        minHeight: 100,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography sx={{ color: brand.neutral[600], fontSize: 12 }}>{label}</Typography>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            bgcolor: current.bg,
            color: current.color,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon ?? <IconArrowUp size={18} />}
        </Box>
      </Stack>
      <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 17, mt: 1 }}>
        {value}
      </Typography>
      <Typography
        sx={{
          color: tone === 'error' ? brand.error.main : brand.primary[600],
          fontSize: 12,
          fontWeight: 800,
          mt: 1,
        }}
      >
        Live{' '}
        <Box component="span" sx={{ color: muted(isDark), fontWeight: 500 }}>
          selected period
        </Box>
      </Typography>
    </Box>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color: brand.neutral[700], fontSize: 12 }}>{label}</Typography>
    </Stack>
  );
}

function PaymentRow({
  label,
  value,
  color,
  total,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color: brand.neutral[700], fontSize: 13, flex: 1 }}>{label}</Typography>
      <Typography sx={{ color: brand.neutral[600], fontSize: 13 }}>{formatMoney(value)}</Typography>
      <Typography sx={{ color: brand.neutral[600], fontSize: 13, width: 38, textAlign: 'right' }}>
        {pct}%
      </Typography>
    </Stack>
  );
}

function formatSaleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function EmptyPanel({
  title,
  subtitle,
  height,
  compact = false,
}: {
  title: string;
  subtitle: string;
  height: number;
  compact?: boolean;
}) {
  const { activeMode: _ep } = useContext(CustomizerContext);
  const isDark = _ep === 'dark';
  return (
    <Box
      sx={{
        height,
        minHeight: height,
        borderRadius: compact ? '8px' : '12px',
        border: compact ? 'none' : `1px dashed ${brand.neutral[200]}`,
        bgcolor: compact ? 'transparent' : brand.neutral[50],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: compact ? 0 : 2,
        textAlign: 'center',
      }}
    >
      {title && (
        <Typography sx={{ color: titleColor, fontWeight: 800, fontSize: compact ? 12 : 14 }}>
          {title}
        </Typography>
      )}
      <Typography sx={{ color: muted(isDark), fontSize: compact ? 11 : 12, mt: title ? 0.25 : 0 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

function profitMargin(data: Dashboard | null) {
  if (!data?.sales.net) return 0;
  return (data.netProfit / data.sales.net) * 100;
}

function DashboardSkeleton() {
  const { activeMode: _sk } = useContext(CustomizerContext);
  const isDark = _sk === 'dark';
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 10 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, lg: index === 0 ? 4 : 2 }}>
          <Card elevation={0} sx={{ ...cardSx(isDark), minHeight: index === 0 ? 250 : 160 }}>
            <CardContent>
              <Skeleton width="35%" />
              <Skeleton width="75%" height={36} />
              <Skeleton variant="rounded" height={90} sx={{ mt: 2, borderRadius: '10px' }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
