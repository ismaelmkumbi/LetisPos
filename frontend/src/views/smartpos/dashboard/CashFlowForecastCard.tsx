import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { IconArrowDown, IconCash, IconAlertTriangle } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, darkToneBg, titleColor, muted, chartFont } from './utils';
import EmptyPanel from './EmptyPanel';
import type { CashFlowForecast } from 'src/api/smartpos/dashboardIntelligence';
import { memo } from 'react';

interface CashFlowForecastCardProps {
  data: CashFlowForecast | null;
  loading: boolean;
  isDark: boolean;
}

function statChip(label: string, value: string, tone: 'info' | 'error' | 'warning', isDark: boolean) {
  const colors = {
    info: { bg: isDark ? darkToneBg.info : brand.info.light, color: brand.info.main, border: isDark ? 'rgba(59,130,246,0.28)' : brand.info.light },
    error: { bg: isDark ? darkToneBg.error : brand.error.light, color: brand.error.main, border: isDark ? 'rgba(239,68,68,0.30)' : brand.error.light },
    warning: { bg: isDark ? darkToneBg.warning : brand.warning.light, color: brand.warning.main, border: isDark ? 'rgba(245,158,11,0.30)' : brand.warning.light },
  };
  const c = colors[tone];
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: '8px',
        border: `1px solid ${c.border}`,
        bgcolor: c.bg,
        minWidth: 0,
        flex: 1,
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 900, color: isDark ? brand.neutral[100] : brand.neutral[900], mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

function cashFlowSparkOptions(color: string, safetyThreshold: number): ApexOptions {
  return {
    chart: {
      type: 'area',
      sparkline: { enabled: true },
      toolbar: { show: false },
      fontFamily: chartFont,
    },
    colors: [color],
    stroke: { curve: 'smooth', width: 2.2 },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.22,
        opacityTo: 0.02,
        stops: [0, 90],
      },
    },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v) => formatMoney(v) } },
    annotations: {
      yaxis: [
        {
          y: safetyThreshold,
          borderColor: brand.error.main,
          borderWidth: 1,
          strokeDashArray: 5,
          opacity: 0.7,
          label: {
            text: 'Danger',
            style: {
              color: brand.error.main,
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: chartFont,
            },
          },
        },
      ],
    },
  };
}

function CashFlowForecastCard({
  data,
  loading,
  isDark,
}: CashFlowForecastCardProps) {
  const forecastDays = data?.dailyProjections?.length ?? 30;
  const closingSeries: number[] =
    data?.dailyProjections?.map((d) => d.closingBalance) ?? [];
  const dangerDays =
    data?.dailyProjections?.filter((d) => d.isDangerDay).length ?? 0;

  // Choose chart color based on cash position
  const chartColor =
    data && data.lowestBalance < 0
      ? brand.error.main
      : data && data.lowestBalance < (data.safetyThreshold * 2)
        ? brand.warning.main
        : brand.info.main;

  const options = cashFlowSparkOptions(
    chartColor,
    data?.safetyThreshold ?? 0,
  );

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        {/* Title */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
              Cash Flow Forecast
            </Typography>
            <Typography sx={{ color: muted(isDark), fontSize: 12, mt: 0.25 }}>
              Next {forecastDays} days
            </Typography>
          </Box>
          {dangerDays > 0 && (
            <Chip
              size="small"
              icon={<IconAlertTriangle size={14} />}
              label={`${dangerDays} danger day${dangerDays !== 1 ? 's' : ''}`}
              sx={{
                height: 24,
                fontSize: 11,
                fontWeight: 800,
                bgcolor: isDark ? darkToneBg.error : brand.error.light,
                color: brand.error.main,
                '& .MuiChip-icon': { color: brand.error.main, marginLeft: '4px' },
              }}
            />
          )}
        </Stack>

        {/* Loading */}
        {loading && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress sx={{ mb: 1, borderRadius: '4px' }} />
            <Skeleton variant="rounded" height={62} sx={{ borderRadius: '10px', mt: 1.5 }} />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: '8px' }} />
              <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: '8px' }} />
              <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: '8px' }} />
            </Stack>
          </Box>
        )}

        {/* Empty */}
        {!loading && !data && (
          <EmptyPanel
            title="No projection available"
            subtitle="Not enough payment data for cash flow projection"
            height={160}
            compact
          />
        )}

        {/* Content */}
        {!loading && data && (
          <>
            {/* Stats row */}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              {statChip(
                'Opening Balance',
                formatMoney(data.openingBalance),
                'info',
                isDark,
              )}
              {statChip(
                'Lowest Balance',
                `${formatMoney(data.lowestBalance)}`,
                data.lowestBalance < data.safetyThreshold ? 'error' : 'warning',
                isDark,
              )}
              {statChip(
                'Safety Threshold',
                formatMoney(data.safetyThreshold),
                'info',
                isDark,
              )}
            </Stack>

            {/* Lowest balance date info */}
            {data.lowestBalanceDate && (
              <Typography sx={{ color: muted(isDark), fontSize: 11, mt: 0.5, ml: 0.5 }}>
                Lowest projected balance on{' '}
                {new Date(data.lowestBalanceDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Typography>
            )}

            {/* Sparkline chart */}
            <Box sx={{ mt: 1.5, mx: -1 }}>
              {closingSeries.length > 0 ? (
                <Chart
                  options={options}
                  series={[{ name: 'Balance', data: closingSeries }]}
                  type="area"
                  height={72}
                />
              ) : (
                <EmptyPanel
                  title="No trend data"
                  subtitle="Projection series will appear here."
                  height={62}
                  compact
                />
              )}
            </Box>

            {/* Footer */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[100]}` }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconCash size={14} color={brand.neutral[500]} />
                <Typography sx={{ color: muted(isDark), fontSize: 12 }}>
                  {dangerDays === 0
                    ? 'All days above safety threshold'
                    : `${dangerDays} of ${forecastDays} days below safety threshold`}
                </Typography>
              </Stack>
              {data.lowestBalance < 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconArrowDown size={13} color={brand.error.main} />
                  <Typography sx={{ color: brand.error.main, fontSize: 12, fontWeight: 700 }}>
                    Negative balance projected
                  </Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CashFlowForecastCard);
