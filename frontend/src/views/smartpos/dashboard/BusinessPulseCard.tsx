import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { IconArrowDown, IconArrowUp, IconWalletOff } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, PERIOD_LABELS, sparkOptions } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Dashboard, Period } from 'src/api/smartpos/reports';

interface BusinessPulseCardProps {
  data: Dashboard | null;
  salesSeries: number[];
  period: Period;
}

export default function BusinessPulseCard({
  data,
  salesSeries,
  period,
}: BusinessPulseCardProps) {
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
