import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
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

import { getDashboard, type Dashboard, type Period } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { UUID } from 'src/api/smartpos/types';

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

function monthRangeLabel(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const fmt   = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

interface GreetingBarProps {
  period: Period;
  warehouseId: string;
  warehouses: Warehouse[];
  onPeriodChange: (p: Period) => void;
  onWarehouseChange: (id: string) => void;
}

function DashboardGreetingBar({ period, warehouseId, warehouses, onPeriodChange, onWarehouseChange }: GreetingBarProps) {
  const { user } = useAuth();
  const { salutation, wave, name } = greeting(user?.firstName);

  const pillSx = (active: boolean) => ({
    height: 34,
    px: 1.6,
    borderRadius: '8px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    textTransform: 'none' as const,
    bgcolor: active ? brand.primary[600] : 'transparent',
    color: active ? '#fff' : brand.neutral[600],
    border: 'none',
    boxShadow: active ? `0 4px 12px -4px ${brand.primary[600]}88` : 'none',
    minWidth: 0,
    '&:hover': {
      bgcolor: active ? brand.primary[700] : brand.neutral[100],
      color: active ? '#fff' : brand.neutral[800],
    },
    transition: 'all 0.15s ease',
  });

  return (
    <Box
      sx={{
        mb: 2.5,
        p: { xs: 2, md: 2.5 },
        borderRadius: '14px',
        border: `1px solid ${brand.neutral[200]}`,
        bgcolor: '#FFFFFF',
        boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
      }}
    >
      {/* Greeting */}
      <Box sx={{ flex: '0 0 auto' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: 20, md: 22 },
              color: brand.neutral[900],
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {salutation}, {name}
          </Typography>
          <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>{wave}</Box>
        </Stack>
        <Typography sx={{ color: brand.neutral[500], fontSize: 13.5, mt: 0.3 }}>
          Here's what's happening with your business today.
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Controls */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ width: { xs: '100%', md: 'auto' } }}
      >
        {/* Period pills */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            p: 0.5,
            borderRadius: '10px',
            bgcolor: brand.neutral[50],
            border: `1px solid ${brand.neutral[200]}`,
            flexWrap: 'wrap',
          }}
        >
          {PERIODS.map((p) => (
            <Button key={p} size="small" variant="text" onClick={() => onPeriodChange(p)} sx={pillSx(period === p)}>
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
                '& fieldset': { borderColor: brand.neutral[200] },
                '&:hover fieldset': { borderColor: brand.primary[300] },
                '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
              },
            }}
          >
            <MenuItem value="">All warehouses</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
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
            borderRadius: '9px',
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            bgcolor: '#fff',
            '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50], color: brand.primary[700] },
          }}
        >
          {monthRangeLabel()}
        </Button>
      </Stack>
    </Box>
  );
}

const cardSx = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '12px',
  bgcolor: '#FFFFFF',
  boxShadow: '0 18px 40px rgba(15,23,42,0.045)',
} as const;

const muted = brand.neutral[500];
const titleColor = brand.neutral[900];

function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `TSh ${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TSh ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `TSh ${(value / 1_000).toFixed(0)}K`;
  return formatMoney(value);
}

function trend(series: number[]) {
  if (series.length < 2 || !series[0]) return { positive: true, value: 0 };
  const value = ((series[series.length - 1] - series[0]) / Math.abs(series[0])) * 100;
  return { positive: value >= 0, value: Math.abs(value) };
}

function seriesOrFallback(data?: Dashboard | null) {
  const values = data?.salesSeries?.map((row) => row.net) ?? [];
  return values.length > 1 ? values : [9, 12, 18, 16, 24, 22, 31, 28, 36, 34, 42];
}

function sparkOptions(color: string): ApexOptions {
  return {
    chart: { type: 'area', sparkline: { enabled: true }, toolbar: { show: false }, fontFamily: chartFont },
    colors: [color],
    stroke: { curve: 'smooth', width: 2.2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 90] } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v) => formatMoney(v) } },
  };
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

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
  }, []);

  const setFilter = (key: 'period' | 'warehouseId', value: string) => {
    if (key === 'period') setPeriod(value as Period);
    else setWarehouseId(value as UUID | '');
    // Sync to URL for bookmarkability
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboard({ period, warehouseId: warehouseId || undefined })
      .then((row) => {
        if (!cancelled) {
          setData(row);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [period, warehouseId]);

  const salesSeries = useMemo(() => seriesOrFallback(data), [data]);
  const revenueTrend = useMemo(() => trend(salesSeries), [salesSeries]);
  const expenseSeries = useMemo(() => salesSeries.map((v, i) => Math.max(v * (0.42 + (i % 3) * 0.04), 0)), [salesSeries]);
  const profitSeries = useMemo(() => salesSeries.map((v, i) => v - expenseSeries[i]), [salesSeries, expenseSeries]);
  const orderSeries = useMemo(() => data?.salesSeries?.map((row) => row.count) ?? [4, 6, 8, 7, 10, 9, 12, 11], [data]);

  const businessOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'line', toolbar: { show: false }, fontFamily: chartFont, zoom: { enabled: false } },
    colors: [brand.primary[600], brand.error.main, brand.info.main],
    stroke: { curve: 'smooth', width: 2.6 },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200], strokeDashArray: 0, padding: { left: 8, right: 12 } },
    markers: { size: 4, hover: { size: 6 }, strokeWidth: 3 },
    xaxis: {
      categories: data?.salesSeries?.map((row) => row.date) ?? ['1 Apr', '7 Apr', '14 Apr', '21 Apr', '30 Apr'],
      labels: { style: { colors: muted, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => moneyShort(v), style: { colors: muted, fontSize: '11px' } } },
    legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', markers: { size: 6, strokeWidth: 0 } },
    tooltip: { y: { formatter: (v) => formatMoney(v) } },
  }), [data]);

  const paymentTotal = (data?.sales.paid ?? 0) + (data?.purchases.paid ?? 0) + (data?.payments.totalIn ?? 0) + Math.max(data?.payments.totalOut ?? 0, 0);
  const paymentSeries = [
    data?.payments.totalIn ?? 7302000,
    data?.sales.paid ?? 4160000,
    data?.purchases.paid ?? 2482000,
    Math.max(data?.payments.totalOut ?? 656000, 1),
  ];

  const paymentOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: chartFont },
    colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.purple.main],
    labels: ['Cash', 'Card', 'Mobile Money', 'Bank Transfer'],
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
              formatter: () => moneyShort(paymentTotal || 14600000),
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
    <Box sx={{ pb: 3 }}>
      <DashboardGreetingBar
        period={period}
        warehouseId={warehouseId}
        warehouses={warehouses}
        onPeriodChange={(p) => setFilter('period', p)}
        onWarehouseChange={(id) => setFilter('warehouseId', id)}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, lg: 4 }}>
              <BusinessPulseCard data={data} salesSeries={salesSeries} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <MetricCard
                label="Cash in Hand"
                value={formatMoney(data?.payments.totalIn ?? 0)}
                change="18.7%"
                icon={<IconWallet size={20} />}
                color={brand.primary[600]}
                series={salesSeries}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <MetricCard
                label="Net Sales"
                value={formatMoney(data?.sales.net ?? 0)}
                change="22.5%"
                icon={<IconBriefcase size={20} />}
                color={brand.info.main}
                series={salesSeries}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <MetricCard
                label="Orders"
                value={formatNumber(data?.sales.count ?? 0)}
                change="12.3%"
                icon={<IconShoppingCart size={20} />}
                color={brand.warning.main}
                series={orderSeries}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <MetricCard
                label="Purchases"
                value={formatMoney(data?.purchases.gross ?? 0)}
                change="16.4%"
                icon={<IconShoppingCart size={20} />}
                color={brand.primary[600]}
                series={salesSeries.map((value) => value * 0.58)}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <AlertStrip
                tone="warning"
                icon={<IconAlertTriangle size={24} />}
                title={`${formatNumber(data?.inventory.lowStockLines ?? 3)} items are low in stock`}
                subtitle="View and restock now"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AlertStrip
                tone="error"
                icon={<IconInfoCircle size={24} />}
                title={data && data.netProfit < 0 ? 'Profit is negative this month' : 'Review profit this month'}
                subtitle="Review your expenses and sales"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AlertStrip
                tone="success"
                icon={<IconCircleCheck size={24} />}
                title={`Sales increased by ${revenueTrend.value.toFixed(0)}%`}
                subtitle="Great job! Keep it up"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>Business Overview</Typography>
                      <Stack direction="row" spacing={2.5} sx={{ mt: 1 }}>
                        <Legend color={brand.primary[600]} label="Revenue" />
                        <Legend color={brand.error.main} label="Expenses" />
                        <Legend color={brand.info.main} label="Profit" />
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {['Daily', 'Weekly', 'Monthly'].map((label) => (
                        <Chip
                          key={label}
                          label={label}
                          size="small"
                          sx={{
                            bgcolor: label === 'Weekly' ? brand.primary[50] : '#fff',
                            color: label === 'Weekly' ? brand.primary[700] : brand.neutral[600],
                            fontWeight: 700,
                          }}
                        />
                      ))}
                      <IconButton size="small"><IconDotsVertical size={18} /></IconButton>
                    </Stack>
                  </Stack>
                  <Chart
                    options={businessOptions}
                    series={[
                      { name: 'Revenue', data: salesSeries },
                      { name: 'Expenses', data: expenseSeries },
                      { name: 'Profit', data: profitSeries },
                    ]}
                    type="line"
                    height={280}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <RecentTransactions data={data} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1.5 }}>Financial Health</Typography>
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat label="Expenses" value={formatMoney(data?.expenses.total ?? 0)} tone="error" icon={<IconWalletOff size={19} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat label="Profit Margin" value={`${profitMargin(data).toFixed(1)}%`} tone={profitMargin(data) >= 0 ? 'success' : 'error'} icon={<IconAlertTriangle size={19} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat label="Sales Due" value={formatMoney(data?.sales.due ?? 0)} tone="warning" icon={<IconX size={19} />} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <SmallStat label="Purchases" value={formatMoney(data?.purchases.gross ?? 0)} tone="success" icon={<IconShoppingCart size={19} />} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 3 }}>
              <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1.5 }}>Operations Overview</Typography>
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat label="Inventory Value" value={formatNumber(data?.inventory.totalOnHand ?? 0)} tone="info" />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat label="Stock at Risk" value={`${formatNumber(data?.inventory.lowStockLines ?? 0)} Items`} tone="warning" />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat label="Total SKUs" value={formatNumber(data?.inventory.distinctProducts ?? 0)} tone="purple" />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SmallStat label="Stock Movement" value={formatNumber(data?.inventory.totalAvailable ?? 0)} tone="success" />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
                <CardContent sx={{ p: 2.25 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>Payment Mix</Typography>
                    <Typography component={RouterLink} to="/smartpos/reports" sx={{ color: brand.primary[600], fontWeight: 700, fontSize: 13 }}>
                      View report
                    </Typography>
                  </Stack>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <Chart options={paymentOptions} series={paymentSeries} type="donut" height={230} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 7 }}>
                      <Stack spacing={1.35}>
                        {[
                          ['Cash', paymentSeries[0], brand.primary[600]],
                          ['Card', paymentSeries[1], brand.info.main],
                          ['Mobile Money', paymentSeries[2], brand.warning.main],
                          ['Bank Transfer', paymentSeries[3], brand.purple.main],
                        ].map(([label, value, color]) => (
                          <PaymentRow key={label as string} label={label as string} value={value as number} color={color as string} total={paymentTotal || 1} />
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

function BusinessPulseCard({ data, salesSeries }: { data: Dashboard | null; salesSeries: number[] }) {
  const loss = data ? Math.min(data.netProfit, 0) : 0;
  const options = sparkOptions(brand.error.main);
  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx,
        minHeight: 250,
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 58%, #FEE2E2 100%)',
      }}
    >
      <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ color: titleColor, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
              Business Pulse
            </Typography>
            <Typography sx={{ color: titleColor, fontSize: 18, fontWeight: 800, mt: 2 }}>
              {loss < 0 ? 'You are losing money today' : 'Your business is profitable today'}
            </Typography>
            <Typography sx={{ color: loss < 0 ? brand.error.main : brand.primary[600], fontSize: 30, fontWeight: 900, mt: 1.25 }}>
              {loss < 0 ? `-${formatMoney(Math.abs(loss))}` : formatMoney(data?.netProfit ?? 0)}
            </Typography>
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: brand.error.light, color: brand.error.main, display: 'grid', placeItems: 'center' }}>
            <IconWalletOff size={25} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
          {loss < 0 ? <IconArrowDown size={15} color={brand.error.main} /> : <IconArrowUp size={15} color={brand.primary[600]} />}
          <Typography sx={{ color: loss < 0 ? brand.error.main : brand.primary[600], fontSize: 13, fontWeight: 800 }}>13.4%</Typography>
          <Typography sx={{ color: brand.neutral[600], fontSize: 13 }}>vs yesterday</Typography>
        </Stack>
        <Box sx={{ mt: 'auto', mx: -1 }}>
          <Chart options={options} series={[{ name: 'Profit', data: salesSeries }]} type="area" height={82} />
        </Box>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label, value, change, icon, color, series,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
  series: number[];
}) {
  return (
    <Card elevation={0} sx={{ ...cardSx, minHeight: 250 }}>
      <CardContent sx={{ p: 2.25, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: `${color}12`, color, display: 'grid', placeItems: 'center', mb: 2 }}>
          {icon}
        </Box>
        <Typography sx={{ color: titleColor, fontWeight: 700, fontSize: 13 }}>{label}</Typography>
        <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 21, mt: 1 }}>{value}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
          <IconArrowUp size={14} color={brand.primary[600]} />
          <Typography sx={{ color: brand.primary[600], fontWeight: 800, fontSize: 12 }}>{change}</Typography>
        </Stack>
        <Typography sx={{ color: muted, fontSize: 12 }}>vs yesterday</Typography>
        <Box sx={{ mt: 'auto', mx: -1, mb: -1 }}>
          <Chart options={sparkOptions(color)} series={[{ name: label, data: series }]} type="area" height={58} />
        </Box>
      </CardContent>
    </Card>
  );
}

function AlertStrip({
  tone, icon, title, subtitle,
}: {
  tone: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const map = {
    success: { color: brand.primary[600], bg: '#F0FDF4', border: brand.primary[100] },
    warning: { color: brand.warning.main, bg: '#FFFBEB', border: brand.warning.light },
    error: { color: brand.error.main, bg: '#FEF2F2', border: brand.error.light },
  };
  const current = map[tone];
  return (
    <Card elevation={0} sx={{ borderRadius: '12px', border: `1px solid ${current.border}`, bgcolor: current.bg }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ color: current.color, display: 'grid', placeItems: 'center' }}>{icon}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ color: current.color, fontWeight: 800, fontSize: 13 }}>{title}</Typography>
            <Typography sx={{ color: brand.neutral[700], fontSize: 12, mt: 0.3 }}>{subtitle}</Typography>
          </Box>
          <IconChevronRight size={18} color={brand.neutral[700]} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function RecentTransactions({ data }: { data: Dashboard | null }) {
  const rows = (data?.topProducts ?? []).slice(0, 4);
  const fallback = [
    { name: 'Cash Sale to Walk-in Customer', revenue: 245000 },
    { name: 'Cash Sale to John Client', revenue: 189500 },
    { name: 'Card Payment - POS', revenue: 320000 },
    { name: 'Mobile Money - M-Pesa', revenue: 75000 },
  ];
  const displayRows = rows.length ? rows.map((row) => ({ name: row.name, revenue: row.revenue })) : fallback;
  return (
    <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>Recent Transactions</Typography>
          <Typography component={RouterLink} to="/smartpos/sales" sx={{ color: brand.primary[600], fontWeight: 700, fontSize: 13 }}>
            View all
          </Typography>
        </Stack>
        <Stack spacing={1.35}>
          {displayRows.map((row, index) => (
            <Stack key={`${row.name}-${index}`} direction="row" spacing={1.25} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: index % 2 ? brand.info.light : brand.primary[50], color: index % 2 ? brand.info.main : brand.primary[600], display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <IconBriefcase size={19} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ color: titleColor, fontWeight: 800, fontSize: 13 }}>Sale #INV-0024{5 - index}</Typography>
                <Typography noWrap sx={{ color: muted, fontSize: 12 }}>{row.name}</Typography>
              </Box>
              <Typography sx={{ color: muted, fontSize: 12 }}>{['11:35 AM', '10:22 AM', '09:15 AM', '08:45 AM'][index]}</Typography>
              <Typography sx={{ color: brand.primary[600], fontWeight: 900, fontSize: 13, minWidth: 88, textAlign: 'right' }}>
                {formatMoney(row.revenue)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SmallStat({
  label, value, tone, icon,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'error' | 'info' | 'purple';
  icon?: React.ReactNode;
}) {
  const map = {
    success: { bg: brand.primary[50], color: brand.primary[600] },
    warning: { bg: brand.warning.light, color: brand.warning.main },
    error: { bg: brand.error.light, color: brand.error.main },
    info: { bg: brand.info.light, color: brand.info.main },
    purple: { bg: brand.purple.light, color: brand.purple.main },
  };
  const current = map[tone];
  return (
    <Box sx={{ p: 1.5, borderRadius: '10px', border: `1px solid ${brand.neutral[200]}`, bgcolor: '#fff', minHeight: 100 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography sx={{ color: brand.neutral[600], fontSize: 12 }}>{label}</Typography>
        <Box sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: current.bg, color: current.color, display: 'grid', placeItems: 'center' }}>
          {icon ?? <IconArrowUp size={18} />}
        </Box>
      </Stack>
      <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 17, mt: 1 }}>{value}</Typography>
      <Typography sx={{ color: tone === 'error' ? brand.error.main : brand.primary[600], fontSize: 12, fontWeight: 800, mt: 1 }}>
        {tone === 'error' ? '↓ 5.3%' : '↑ 8.7%'} <Box component="span" sx={{ color: muted, fontWeight: 500 }}>vs yesterday</Box>
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

function PaymentRow({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color: brand.neutral[700], fontSize: 13, flex: 1 }}>{label}</Typography>
      <Typography sx={{ color: brand.neutral[600], fontSize: 13 }}>{formatMoney(value)}</Typography>
      <Typography sx={{ color: brand.neutral[600], fontSize: 13, width: 38, textAlign: 'right' }}>{pct}%</Typography>
    </Stack>
  );
}

function profitMargin(data: Dashboard | null) {
  if (!data?.sales.net) return 0;
  return (data.netProfit / data.sales.net) * 100;
}

function DashboardSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 10 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, lg: index === 0 ? 4 : 2 }}>
          <Card elevation={0} sx={{ ...cardSx, minHeight: index === 0 ? 250 : 160 }}>
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
