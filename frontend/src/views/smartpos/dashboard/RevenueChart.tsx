/**
 * RevenueChart — combo chart: area (revenue) + column bars (order volume).
 *
 * Changes vs original:
 * - Mixed chart: revenue as smooth area (primary Y), order count as column bars
 *   on a secondary Y-axis — gives instant context ("high revenue but few big orders?")
 * - Outfit label font + JetBrains Mono axis labels for visual authority
 * - Chart height 240 → 280px (desktop), 210px mobile
 * - Subtler gridlines: strokeDashArray 3 (dashed, lighter)
 * - Rounded column bars (borderRadius: 4) for a modern look
 * - Forecast and previous-period series logic fully preserved
 * - Better empty state with navigation CTA
 */
import {
  Box, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import { IconArrowRight, IconDotsVertical } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, PERIOD_LABELS, moneyShort, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Dashboard, Period, Forecast } from 'src/api/smartpos/reports';

const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";
const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";

interface RevenueChartProps {
  salesSeries: number[];
  orderSeries?: number[];
  period: Period;
  isDark: boolean;
  data: Dashboard | null;
  previousSalesSeries?: number[];
  forecast?: Forecast | null;
}

function LegendDot({ color, label, dashed, isDark }: { color: string; label: string; dashed?: boolean; isDark: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {dashed ? (
        <Box sx={{ width: 14, height: 0, borderTop: `2px dashed ${color}`, mt: '-1px', flexShrink: 0 }} />
      ) : (
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      )}
      <Typography
        sx={{ fontFamily: LBL_FONT, color: brand.neutral[isDark ? 400 : 500], fontSize: 11.5, fontWeight: 500 }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function RevenueChart({
  salesSeries,
  orderSeries = [],
  period,
  isDark,
  data,
  previousSalesSeries,
  forecast,
}: RevenueChartProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const chartHeight = isXs ? 210 : 280;

  const handleDataPointSelection = useCallback(() => {
    navigate('/smartpos/reports/sales');
  }, [navigate]);

  const hasForecast = !!(forecast?.projected?.length);
  const hasOrders   = orderSeries.length > 0;

  const categories = useMemo(() => {
    const base = data?.salesSeries?.map((row) => row.date) ?? [];
    if (hasForecast) {
      const fDates = forecast!.projected.map((p) => p.date);
      return [...base, ...fDates];
    }
    return base;
  }, [data, forecast, hasForecast]);

  const histLen = useMemo(() => data?.salesSeries?.length ?? 0, [data?.salesSeries?.length]);

  // ─── ApexCharts options ─────────────────────────────────────────────────────
  const chartOptions: ApexOptions = useMemo(() => {
    const barColor  = isDark ? 'rgba(22,163,74,0.22)' : 'rgba(22,163,74,0.14)';

    const base: ApexOptions = {
      chart: {
        type: 'line',               // overridden per-series via series[].type
        toolbar: { show: false },
        fontFamily: LBL_FONT,
        zoom: { enabled: false },
        events: { dataPointSelection: handleDataPointSelection },
        animations: { enabled: true, speed: 600 },
      },
      // Colors: [revenue, orders-bar, prev-period, forecast]
      colors: [brand.primary[600], barColor],
      stroke: {
        curve: 'smooth',
        width: [2.6, 0],   // bars have no stroke
        dashArray: [0, 0],
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
        strokeDashArray: 3,
        padding: { left: 4, right: 12, top: 0, bottom: 0 },
      },
      markers: {
        size: [4, 0],
        hover: { size: 6 },
        strokeWidth: 2,
        strokeColors: isDark ? brand.neutral[800] : '#fff',
      },
      fill: {
        type: ['gradient', 'solid'],
        gradient: {
          shade: isDark ? 'dark' : 'light',
          type: 'vertical',
          shadeIntensity: 0.5,
          opacityFrom: 0.3,
          opacityTo: 0.02,
          stops: [0, 95],
        },
      },
      plotOptions: {
        bar: {
          columnWidth: '52%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
        },
      },
      xaxis: {
        categories,
        labels: {
          style: { colors: muted(isDark), fontSize: '10.5px', fontFamily: NUM_FONT },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: {
          stroke: { color: isDark ? brand.neutral[600] : brand.neutral[300], dashArray: 3 },
        },
      },
      yaxis: [
        {
          seriesName: 'Revenue',
          labels: {
            formatter: (v) => moneyShort(v),
            style: { colors: muted(isDark), fontSize: '10.5px', fontFamily: NUM_FONT },
          },
        },
        ...(hasOrders
          ? [
              {
                seriesName: 'Orders',
                opposite: true,
                labels: {
                  formatter: (v: number) => formatNumber(Math.round(v)),
                  style: { colors: muted(isDark), fontSize: '10.5px', fontFamily: NUM_FONT },
                },
                title: {
                  text: 'Orders',
                  style: { color: muted(isDark) as unknown as string, fontSize: '10px', fontFamily: LBL_FONT },
                },
              } as ApexYAxis,
            ]
          : []),
      ],
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false,
        style: { fontFamily: LBL_FONT },
        y: {
          formatter: (v, { seriesIndex }) => {
            if (seriesIndex === 1 && hasOrders) return `${formatNumber(Math.round(v))} orders`;
            if (seriesIndex === 2 && previousSalesSeries?.length) return `Prev: ${formatMoney(v)}`;
            if (seriesIndex === (hasOrders ? 3 : 2) && hasForecast) return `Projected: ${formatMoney(v)}`;
            return formatMoney(v);
          },
        },
        theme: isDark ? 'dark' : 'light',
      },
      states: {
        hover: {
          filter: { type: 'lighten' },
        },
      },
    };

    // ── Previous period overlay (dashed area line) ───────────────────────────
    if (previousSalesSeries?.length) {
      const colors = [...(base.colors as string[]), brand.neutral[400]];
      base.colors = colors;
      base.stroke = {
        curve: 'smooth',
        width: [2.6, 0, 1.8],
        dashArray: [0, 0, 5],
      };
      if (Array.isArray(base.markers?.size)) {
        (base.markers as ApexMarkers).size = [4, 0, 0];
      }
      if (Array.isArray((base.fill as ApexFill).type)) {
        ((base.fill as ApexFill).type as string[]).push('solid');
      }
    }

    // ── Forecast overlay (dashed info-blue line) ─────────────────────────────
    if (hasForecast) {
      const colors = [...(base.colors as string[]), brand.info.main];
      base.colors = colors;
      const currentWidths = Array.isArray(base.stroke?.width)
        ? (base.stroke!.width as number[])
        : [2.6, 0];
      const currentDashes = Array.isArray(base.stroke?.dashArray)
        ? (base.stroke!.dashArray as number[])
        : [0, 0];
      base.stroke = {
        curve: 'smooth',
        width: [...currentWidths, 2],
        dashArray: [...currentDashes, 6],
      };
      if (Array.isArray(base.markers?.size)) {
        (base.markers as ApexMarkers).size = [...(base.markers!.size as number[]), 0];
      }
      if (Array.isArray((base.fill as ApexFill).type)) {
        ((base.fill as ApexFill).type as string[]).push('solid');
      }

      // Annotation: forecast start vertical line
      if (histLen > 0) {
        base.annotations = {
          xaxis: [
            {
              x: categories[histLen - 1],
              borderColor: brand.info.main,
              borderWidth: 1,
              strokeDashArray: 4,
              label: {
                text: 'Forecast start',
                style: {
                  color: brand.info.main,
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: LBL_FONT,
                  background: isDark ? brand.neutral[800] : '#fff',
                  padding: { top: 3, bottom: 3, left: 6, right: 6 },
                },
              },
            },
          ],
        };
      }
    }

    return base;
  }, [
    categories, isDark, hasOrders, hasForecast, previousSalesSeries,
    histLen, handleDataPointSelection,
  ]);

  // ─── Series ──────────────────────────────────────────────────────────────────
  const series = useMemo((): ApexAxisChartSeries => {
    const result: ApexAxisChartSeries = [];

    // 1. Revenue — smooth area
    result.push({
      name: 'Revenue',
      type: 'area',
      data: salesSeries,
    });

    // 2. Order volume — column bars (secondary Y)
    if (hasOrders) {
      const padded = [...orderSeries];
      while (padded.length < categories.length) padded.push(0);
      result.push({
        name: 'Orders',
        type: 'column',
        data: padded.slice(0, categories.length),
      });
    }

    // 3. Previous period (dashed line, same Y)
    if (previousSalesSeries?.length) {
      const padded = [...previousSalesSeries];
      while (padded.length < categories.length) padded.push(null as unknown as number);
      result.push({
        name: 'Previous period',
        type: 'line',
        data: padded.slice(0, categories.length),
      });
    }

    // 4. Forecast (dashed info line)
    if (hasForecast) {
      const histLen = salesSeries.length;
      const fData: (number | null)[] = Array(histLen).fill(null);
      for (const p of forecast!.projected) fData.push(p.value);
      result.push({
        name: 'Forecast',
        type: 'line',
        data: fData as number[],
      });
    }

    return result;
  }, [salesSeries, orderSeries, previousSalesSeries, forecast, hasForecast, hasOrders, categories.length]);

  // ─── Summary stats (above the chart) ─────────────────────────────────────────
  const totalRevenue = salesSeries.reduce((a, b) => a + b, 0);
  const totalOrders  = orderSeries.reduce((a, b) => a + b, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>

        {/* ── Header row ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: LBL_FONT,
                fontWeight: 800,
                color: isDark ? brand.neutral[100] : titleColor,
                fontSize: { xs: 15, sm: 17 },
                letterSpacing: '-0.01em',
              }}
            >
              Business Overview
            </Typography>

            {/* Quick-stat chips below title */}
            {salesSeries.length > 0 && (
              <Stack direction="row" spacing={2} sx={{ mt: 0.75 }} flexWrap="wrap">
                <Box>
                  <Typography sx={{ fontFamily: NUM_FONT, fontWeight: 700, fontSize: 13, color: brand.primary[600] }}>
                    {moneyShort(totalRevenue)}
                  </Typography>
                  <Typography sx={{ fontFamily: LBL_FONT, fontSize: 10.5, color: isDark ? brand.neutral[500] : brand.neutral[400] }}>
                    total revenue
                  </Typography>
                </Box>
                {hasOrders && (
                  <>
                    <Box sx={{ width: '1px', bgcolor: isDark ? brand.neutral[700] : brand.neutral[200] }} />
                    <Box>
                      <Typography sx={{ fontFamily: NUM_FONT, fontWeight: 700, fontSize: 13, color: brand.warning.main }}>
                        {formatNumber(totalOrders)}
                      </Typography>
                      <Typography sx={{ fontFamily: LBL_FONT, fontSize: 10.5, color: isDark ? brand.neutral[500] : brand.neutral[400] }}>
                        orders
                      </Typography>
                    </Box>
                    <Box sx={{ width: '1px', bgcolor: isDark ? brand.neutral[700] : brand.neutral[200] }} />
                    <Box>
                      <Typography sx={{ fontFamily: NUM_FONT, fontWeight: 700, fontSize: 13, color: brand.info.main }}>
                        {moneyShort(aov)}
                      </Typography>
                      <Typography sx={{ fontFamily: LBL_FONT, fontSize: 10.5, color: isDark ? brand.neutral[500] : brand.neutral[400] }}>
                        avg order
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            )}
          </Box>

          {/* Right side: period chip + actions */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} sx={{ ml: 1 }}>
            <Chip
              label={PERIOD_LABELS[period]}
              size="small"
              sx={{
                fontFamily: LBL_FONT,
                bgcolor: isDark ? brand.primary[900] : brand.primary[50],
                color: brand.primary[700],
                fontWeight: 700,
                fontSize: 11,
                height: 24,
              }}
            />
            <Tooltip title="View sales report">
              <IconButton size="small" onClick={() => navigate('/smartpos/reports/sales')}>
                <IconArrowRight size={16} />
              </IconButton>
            </Tooltip>
            <IconButton size="small">
              <IconDotsVertical size={16} />
            </IconButton>
          </Stack>
        </Stack>

        {/* ── Legend ── */}
        {salesSeries.length > 0 && (
          <Stack direction="row" spacing={2.5} sx={{ mb: 1.5 }} flexWrap="wrap">
            <LegendDot color={brand.primary[600]} label="Revenue" isDark={isDark} />
            {hasOrders && (
              <LegendDot color={brand.primary[600]} label="Order volume" isDark={isDark} />
            )}
            {previousSalesSeries?.length ? (
              <LegendDot color={brand.neutral[400]} label="Previous period" dashed isDark={isDark} />
            ) : null}
            {hasForecast ? (
              <LegendDot color={brand.info.main} label="Forecast" dashed isDark={isDark} />
            ) : null}
          </Stack>
        )}

        {/* ── Chart ── */}
        {salesSeries.length ? (
          <Chart
            options={chartOptions}
            series={series}
            type="line"
            height={chartHeight}
          />
        ) : (
          <EmptyPanel
            title="No sales trend yet"
            subtitle="Confirmed sales will appear here as soon as they are recorded."
            height={chartHeight}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default memo(RevenueChart);
