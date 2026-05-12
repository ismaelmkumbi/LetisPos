import { Box, Card, CardContent, Chip, IconButton, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { IconDotsVertical } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, PERIOD_LABELS, chartFont, moneyShort, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Dashboard, Period, Forecast } from 'src/api/smartpos/reports';

interface RevenueChartProps {
  salesSeries: number[];
  period: Period;
  isDark: boolean;
  data: Dashboard | null;
  previousSalesSeries?: number[];
  forecast?: Forecast | null;
}

function SolidLegend({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color: brand.neutral[700], fontSize: 12 }}>{label}</Typography>
    </Stack>
  );
}

function DashedLegend({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={{
          width: 14,
          height: 0,
          borderTop: `2px dashed ${color}`,
          mt: '-2px',
        }}
      />
      <Typography sx={{ color: brand.neutral[500], fontSize: 12 }}>{label}</Typography>
    </Stack>
  );
}

export default function RevenueChart({
  salesSeries,
  period,
  isDark,
  data,
  previousSalesSeries,
  forecast,
}: RevenueChartProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const chartHeight = isXs ? 200 : 240;

  const handleDataPointSelection = useCallback(
    () => {
      navigate('/smartpos/reports/sales');
    },
    [navigate],
  );

  const hasForecast = !!(forecast?.projected?.length);

  const categories = useMemo(() => {
    const base = data?.salesSeries?.map((row) => row.date) ?? [];
    if (hasForecast) {
      const fDates = forecast!.projected.map((p) => p.date);
      return [...base, ...fDates];
    }
    return base;
  }, [data, forecast, hasForecast]);

  const businessOptions: ApexOptions = useMemo(() => {
    const opts: ApexOptions = {
      chart: {
        type: 'line',
        toolbar: { show: false },
        fontFamily: chartFont,
        zoom: { enabled: false },
        events: {
          dataPointSelection: handleDataPointSelection,
        },
      },
      colors: [brand.primary[600]],
      stroke: {
        curve: 'smooth',
        width: 2.6,
        dashArray: [0],
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
        strokeDashArray: 0,
        padding: { left: 8, right: 12 },
      },
      markers: {
        size: 4,
        hover: { size: 6 },
        strokeWidth: 3,
      },
      xaxis: {
        categories,
        labels: { style: { colors: muted(isDark), fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (v) => moneyShort(v),
          style: { colors: muted(isDark), fontSize: '11px' },
        },
      },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (v, { seriesIndex }) => {
            if (seriesIndex === 2) return `Projected: ${formatMoney(v)}`;
            return formatMoney(v);
          },
        },
      },
    };

    // Previous period series (dashed)
    if (previousSalesSeries?.length) {
      opts.colors = [brand.primary[600], brand.neutral[400]];
      opts.stroke = {
        curve: 'smooth',
        width: [2.6, 2],
        dashArray: [0, 5],
      };
      opts.markers = {
        size: [4, 0],
        hover: { size: 6 },
        strokeWidth: 3,
      };
    }

    // Forecast series: add forecast color and lighter dash
    if (hasForecast) {
      const currentColors = opts.colors ?? [brand.primary[600]];
      opts.colors = [...currentColors, brand.info.main];
      if (opts.stroke && Array.isArray(opts.stroke.width)) {
        opts.stroke = {
          curve: 'smooth',
          width: [...(opts.stroke.width as number[]), 2],
          dashArray: [...(opts.stroke.dashArray as number[]), 6],
        };
      } else {
        opts.stroke = {
          curve: 'smooth',
          width: [2.6, 2],
          dashArray: [0, 6],
        };
      }
      if (opts.markers && Array.isArray(opts.markers.size)) {
        opts.markers = {
          size: [...(opts.markers.size as number[]), 0],
          hover: { size: 6 },
          strokeWidth: 3,
        };
      }

      // Annotation to show forecast start
      const histLen = data?.salesSeries?.length ?? 0;
      if (histLen > 0) {
        opts.annotations = {
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
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isDark ? brand.neutral[800] : '#fff',
                },
              },
            },
          ],
        };
      }
    }

    return opts;
  }, [data, isDark, previousSalesSeries, hasForecast, categories, handleDataPointSelection]);

  const series = useMemo(() => {
    const result: ApexAxisChartSeries = [];
    result.push({ name: 'Revenue', data: salesSeries });
    if (previousSalesSeries?.length) {
      // Pad previous series with nulls to match categories length
      const padded = [...previousSalesSeries];
      while (padded.length < categories.length) padded.push(null as unknown as number);
      result.push({ name: 'Previous period', data: padded.slice(0, categories.length) });
    }
    if (hasForecast) {
      const histLen = salesSeries.length;
      const fData: (number | null)[] = [];
      // Pad with nulls for historical range
      for (let i = 0; i < histLen; i++) fData.push(null);
      // Add forecast values
      for (const p of forecast!.projected) fData.push(p.value);
      result.push({ name: 'Forecast', data: fData as number[] });
    }
    return result;
  }, [salesSeries, previousSalesSeries, forecast, hasForecast, categories.length]);

  return (
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
              <SolidLegend color={brand.primary[600]} label="Revenue" />
              {previousSalesSeries?.length ? (
                <DashedLegend color={brand.neutral[400]} label="Previous period" />
              ) : null}
              {hasForecast ? (
                <DashedLegend color={brand.info.main} label="Forecast" />
              ) : null}
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
            series={series}
            type="line"
            height={chartHeight}
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
  );
}
