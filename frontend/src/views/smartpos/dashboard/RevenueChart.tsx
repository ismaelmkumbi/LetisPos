import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import { IconDotsVertical } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
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
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color: brand.neutral[700], fontSize: 12 }}>{label}</Typography>
    </Stack>
  );
}

export default function RevenueChart({ salesSeries, period, isDark, data }: RevenueChartProps) {
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
  );
}
