import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import { IconDotsVertical } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, PERIOD_LABELS, chartFont, moneyShort, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Dashboard, Period } from 'src/api/smartpos/reports';

interface RevenueChartProps {
  salesSeries: number[];
  period: Period;
  isDark: boolean;
  data: Dashboard | null;
  previousSalesSeries?: number[];
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
}: RevenueChartProps) {
  const navigate = useNavigate();

  const handleDataPointSelection = useCallback(
    () => {
      navigate('/smartpos/reports/sales');
    },
    [navigate],
  );

  const businessOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'line',
        toolbar: { show: false },
        fontFamily: chartFont,
        zoom: { enabled: false },
        events: {
          dataPointSelection: handleDataPointSelection,
        },
      },
      colors: previousSalesSeries?.length
        ? [brand.primary[600], brand.neutral[400]]
        : [brand.primary[600]],
      stroke: {
        curve: 'smooth',
        width: previousSalesSeries?.length ? [2.6, 2] : 2.6,
        dashArray: previousSalesSeries?.length ? [0, 5] : [0],
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
        strokeDashArray: 0,
        padding: { left: 8, right: 12 },
      },
      markers: {
        size: previousSalesSeries?.length ? [4, 0] : 4,
        hover: { size: 6 },
        strokeWidth: 3,
      },
      xaxis: {
        categories: data?.salesSeries?.map((row) => row.date) ?? [],
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
      tooltip: { y: { formatter: (v) => formatMoney(v) } },
    }),
    [data, isDark, previousSalesSeries, handleDataPointSelection],
  );

  const series = useMemo(() => {
    const current = { name: 'Revenue', data: salesSeries };
    if (previousSalesSeries?.length) {
      return [current, { name: 'Previous period', data: previousSalesSeries }];
    }
    return [current];
  }, [salesSeries, previousSalesSeries]);

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
  );
}
