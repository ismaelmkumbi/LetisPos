import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import type { Dashboard, Period } from 'src/api/smartpos/reports';

export const PERIODS: Period[] = ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'LAST_30_DAYS', 'YTD'];
export const chartFont = 'Inter, DM Sans, sans-serif';

export const PERIOD_LABELS: Record<Period, string> = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  WEEK: 'This week',
  MONTH: 'This month',
  LAST_30_DAYS: 'Last 30 d',
  YTD: 'Year to date',
};

export function greeting(firstName?: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const wave = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
  return { salutation, wave, name: firstName ?? 'there' };
}

export function formatDateRange(from?: string, to?: string) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (from && to) return `${fmt(new Date(from))} - ${fmt(new Date(to))}`;
  const date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${fmt(start)} - ${fmt(end)}`;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function periodRange(period: Period) {
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

export const cardSx = (isDark: boolean) =>
  ({
    border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
    borderRadius: '12px',
    bgcolor: isDark ? brand.neutral[800] : '#FFFFFF',
    boxShadow: isDark ? 'none' : '0 18px 40px rgba(15,23,42,0.045)',
  }) as const;

export const muted = (isDark: boolean) => (isDark ? brand.neutral[400] : brand.neutral[500]);
export const titleColor = 'text.primary';
export const headingColor = (isDark: boolean) => (isDark ? brand.neutral[100] : brand.neutral[900]);
export const darkToneBg = {
  success: 'rgba(34,197,94,0.16)',
  warning: 'rgba(245,158,11,0.16)',
  error: 'rgba(239,68,68,0.16)',
  info: 'rgba(59,130,246,0.16)',
  purple: 'rgba(139,92,246,0.16)',
  neutral: 'rgba(148,163,184,0.14)',
} as const;

export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `TSh ${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TSh ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `TSh ${(value / 1_000).toFixed(0)}K`;
  return formatMoney(value);
}

export type Trend = { positive: boolean; value: number };

/** Map a current period to a reasonable previous period for delta comparison. */
export function previousPeriod(period: Period): Period | null {
  const map: Record<Period, Period | null> = {
    TODAY: 'YESTERDAY',
    YESTERDAY: null,
    WEEK: 'LAST_30_DAYS',
    MONTH: 'LAST_30_DAYS',
    LAST_30_DAYS: 'MONTH',
    YTD: null,
  };
  return map[period];
}

export interface Delta {
  value: number;
  positive: boolean;
}

export function computeDelta(current: number, previous: number): Delta | undefined {
  if (!previous || previous === 0) return undefined;
  const value = ((current - previous) / Math.abs(previous)) * 100;
  return { value: Math.abs(value), positive: value >= 0 };
}

export function trend(series: number[]): Trend | null {
  if (series.length < 2 || !series[0]) return null;
  const value = ((series[series.length - 1] - series[0]) / Math.abs(series[0])) * 100;
  return { positive: value >= 0, value: Math.abs(value) };
}

export function trendLabel(current: Trend | null) {
  if (!current) return null;
  return `${current.positive ? 'Up' : 'Down'} ${current.value.toFixed(1)}%`;
}

export function methodLabel(method: string) {
  return method
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function seriesOrFallback(data?: Dashboard | null) {
  const values = data?.salesSeries?.map((row) => row.net) ?? [];
  return values;
}

export function sparkOptions(color: string): ApexOptions {
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

export function profitMargin(data: Dashboard | null) {
  if (!data?.sales.net) return 0;
  return (data.netProfit / data.sales.net) * 100;
}

export function formatSaleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
