/**
 * PaymentMixCard — redesigned for consistency with the rest of the dashboard.
 *
 * Changes:
 * - Outfit for labels, JetBrains Mono for amounts and percentages
 * - Transaction count + total label in donut center (two-line)
 * - Payment rows: monospace amount + percentage, dot indicator upgraded to colored pill
 * - Title upgraded to match MetricCard / RevenueChart style
 * - View report link with arrow
 */
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, methodLabel, moneyShort } from './utils';
import EmptyPanel from './EmptyPanel';
import type { PaymentMethodMixRow } from 'src/api/smartpos/reports';

const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";
const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";

interface PaymentMixCardProps {
  paymentMix: PaymentMethodMixRow[];
  paymentMixUnavailable: boolean;
  isDark: boolean;
}

const PAYMENT_COLORS = [
  brand.primary[600],
  brand.info.main,
  brand.warning.main,
  brand.purple.main,
  brand.error.main,
  brand.neutral[500],
];

function PaymentRow({
  label,
  value,
  count,
  color,
  total,
  isDark,
}: {
  label: string;
  value: number;
  count?: number;
  color: string;
  total: number;
  isDark: boolean;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
      {/* Color swatch */}
      <Box
        sx={{
          width: 4,
          height: 32,
          borderRadius: '2px',
          bgcolor: color,
          flexShrink: 0,
        }}
      />
      {/* Label + count */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{
            fontFamily: LBL_FONT,
            color: isDark ? brand.neutral[300] : brand.neutral[700],
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {label}
        </Typography>
        {count !== undefined && (
          <Typography
            sx={{
              fontFamily: NUM_FONT,
              color: isDark ? brand.neutral[500] : brand.neutral[400],
              fontSize: 10.5,
            }}
          >
            {count} txns
          </Typography>
        )}
      </Box>
      {/* Amount */}
      <Typography
        sx={{
          fontFamily: NUM_FONT,
          color: isDark ? brand.neutral[200] : brand.neutral[800],
          fontSize: 12.5,
          fontWeight: 700,
          textAlign: 'right',
        }}
      >
        {formatMoney(value)}
      </Typography>
      {/* Percentage pill */}
      <Box
        sx={{
          minWidth: 36,
          height: 20,
          borderRadius: '5px',
          bgcolor: isDark ? `${color}25` : `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: NUM_FONT,
            color,
            fontSize: 10.5,
            fontWeight: 700,
          }}
        >
          {pct}%
        </Typography>
      </Box>
    </Stack>
  );
}

export default function PaymentMixCard({
  paymentMix,
  paymentMixUnavailable,
  isDark,
}: PaymentMixCardProps) {
  const paymentSeries = paymentMix.map((row) => row.total);
  const paymentTotal = paymentSeries.reduce((sum, v) => sum + v, 0);
  const paymentLabels = paymentMix.map((row) => methodLabel(row.method));
  const txnCount = paymentMix.reduce((sum, row) => sum + (row.count ?? 0), 0);

  const paymentOptions: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: LBL_FONT,
      animations: { enabled: true, speed: 500 },
    },
    colors: PAYMENT_COLORS,
    labels: paymentLabels,
    dataLabels: { enabled: false },
    stroke: {
      width: 3,
      colors: [isDark ? brand.neutral[800] : '#FFFFFF'],
    },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: {
              show: true,
              fontFamily: LBL_FONT,
              color: isDark ? brand.neutral[400] : brand.neutral[500],
              fontSize: '11px',
              fontWeight: 600,
              offsetY: -4,
            },
            value: {
              show: true,
              fontFamily: NUM_FONT,
              fontSize: '19px',
              fontWeight: 700,
              color: isDark ? '#F1F5F9' : brand.neutral[900],
              offsetY: 4,
              formatter: (v) => moneyShort(parseFloat(v)),
            },
            total: {
              show: true,
              label: txnCount > 0 ? `${txnCount} txns` : 'Total',
              fontFamily: LBL_FONT,
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? brand.neutral[400] : brand.neutral[500],
              formatter: () => moneyShort(paymentTotal),
            },
          },
        },
      },
    },
    tooltip: {
      style: { fontFamily: LBL_FONT },
      y: { formatter: (v) => formatMoney(v) },
    },
  };

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              fontWeight: 800,
              color: isDark ? '#F1F5F9' : brand.neutral[900],
              fontSize: { xs: 15, sm: 17 },
              letterSpacing: '-0.01em',
            }}
          >
            Payment Mix
          </Typography>
          <Typography
            component={RouterLink}
            to="/smartpos/reports/payments"
            sx={{
              fontFamily: LBL_FONT,
              color: brand.primary[600],
              fontWeight: 700,
              fontSize: 12.5,
              textDecoration: 'none',
              '&:hover': { color: brand.primary[700] },
            }}
          >
            View report →
          </Typography>
        </Stack>

        <Grid container spacing={2} alignItems="center">
          {/* Donut */}
          <Grid size={{ xs: 12, sm: 5 }}>
            {paymentSeries.length ? (
              <Chart
                options={paymentOptions}
                series={paymentSeries}
                type="donut"
                height={200}
              />
            ) : (
              <EmptyPanel
                title={paymentMixUnavailable ? 'Unavailable' : 'No payments yet'}
                subtitle={
                  paymentMixUnavailable
                    ? 'Dashboard data is still live.'
                    : 'Completed payments will build this mix.'
                }
                height={200}
              />
            )}
          </Grid>

          {/* Rows */}
          <Grid size={{ xs: 12, sm: 7 }}>
            <Stack spacing={0.25} divider={
              <Box sx={{ height: '1px', bgcolor: isDark ? brand.neutral[700] : brand.neutral[100] }} />
            }>
              {paymentMix.map((row, index) => (
                <PaymentRow
                  key={row.method}
                  label={methodLabel(row.method)}
                  value={row.total}
                  count={row.count}
                  color={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
                  total={paymentTotal || 1}
                  isDark={isDark}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
