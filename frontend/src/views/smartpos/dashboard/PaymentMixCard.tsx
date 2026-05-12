import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, methodLabel, moneyShort, chartFont } from './utils';
import EmptyPanel from './EmptyPanel';
import type { PaymentMethodMixRow } from 'src/api/smartpos/reports';

interface PaymentMixCardProps {
  paymentMix: PaymentMethodMixRow[];
  paymentMixUnavailable: boolean;
  isDark: boolean;
}

const paymentColors = [
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

export default function PaymentMixCard({
  paymentMix,
  paymentMixUnavailable,
  isDark,
}: PaymentMixCardProps) {
  const paymentSeries = paymentMix.map((row) => row.total);
  const paymentTotal = paymentSeries.reduce((sum, value) => sum + value, 0);
  const paymentLabels = paymentMix.map((row) => methodLabel(row.method));

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
  );
}
