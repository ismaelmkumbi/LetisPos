/**
 * BusinessPulseCard — redesigned as the HERO card of the dashboard.
 *
 * Design intent:
 * - Full-bleed deep gradient (green when profitable, red when loss)
 * - White text throughout — contrast on dark bg
 * - LARGE net profit number (36px Mono) as the dominant focal point
 * - Three supporting stats below: Revenue | Expenses | Margin
 * - Profit sparkline at card bottom (white/semi-transparent)
 * - Status pill at top-right
 */
import {
  Box, Card, CardContent, Chip, Stack, Typography,
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import { useContext, useMemo } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { formatMoney } from 'src/utils/smartpos/currency';
import { PERIOD_LABELS, sparkOptions, profitMargin } from './utils';
import type { Dashboard, Period } from 'src/api/smartpos/reports';
import type { Delta } from './types';

const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";
const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";

interface BusinessPulseCardProps {
  data: Dashboard | null;
  salesSeries: number[];
  period: Period;
  delta?: Delta;
}

export default function BusinessPulseCard({ data, salesSeries, period, delta }: BusinessPulseCardProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  const profit      = data?.netProfit ?? 0;
  const isLoss      = profit < 0;
  const periodLabel = PERIOD_LABELS[period];
  const margin      = profitMargin(data);
  const revenue     = data?.sales.net ?? 0;
  const expenses    = data?.expenses.total ?? 0;

  // Gradient backgrounds
  const bg = isLoss
    ? isDark
      ? 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 55%, #991b1b 100%)'
      : 'linear-gradient(135deg, #b91c1c 0%, #dc2626 60%, #ef4444 100%)'
    : isDark
      ? 'linear-gradient(135deg, #052e16 0%, #14532d 55%, #166534 100%)'
      : 'linear-gradient(135deg, #14532d 0%, #15803d 60%, #16a34a 100%)';

  const sparkColor = 'rgba(255,255,255,0.7)';
  const spkOpts = useMemo(() => ({
    ...sparkOptions(sparkColor),
    chart: { type: 'area' as const, sparkline: { enabled: true }, toolbar: { show: false } },
    fill: {
      type: 'gradient' as const,
      gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 100] },
    },
    colors: [sparkColor],
    stroke: { curve: 'smooth' as const, width: 2 },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  }), []);

  const supportStats = [
    {
      label: 'Revenue',
      value: formatMoney(revenue),
      sub: 'net sales',
    },
    {
      label: 'Expenses',
      value: formatMoney(expenses),
      sub: 'total costs',
    },
    {
      label: 'Margin',
      value: `${margin.toFixed(1)}%`,
      sub: margin >= 20 ? 'healthy' : margin >= 10 ? 'marginal' : 'needs attention',
    },
  ];

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        minHeight: { xs: 200, sm: 204 },
        borderRadius: '14px',
        background: bg,
        border: 'none',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Decorative circle — top-right */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          bottom: 24,
          right: -20,
          width: 90,
          height: 90,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }}
      />

      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

        {/* Header row */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Business Pulse · {periodLabel}
          </Typography>

          {/* Status pill */}
          <Chip
            size="small"
            icon={isLoss ? <IconTrendingDown size={12} /> : <IconTrendingUp size={12} />}
            label={isLoss ? 'Loss' : 'Profitable'}
            sx={{
              height: 22,
              fontFamily: LBL_FONT,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.22)',
              '& .MuiChip-icon': { color: '#fff', ml: '4px' },
            }}
          />
        </Stack>

        {/* Net Profit — hero number */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25, mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: NUM_FONT,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: { xs: 28, sm: 34 },
              lineHeight: 1,
              letterSpacing: '-0.03em',
              textShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}
          >
            {isLoss ? `−${formatMoney(Math.abs(profit))}` : formatMoney(profit)}
          </Typography>
          {delta && (
            <Chip
              size="small"
              icon={delta.positive ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
              label={`${delta.positive ? '+' : '−'}${delta.value.toFixed(1)}%`}
              sx={{
                height: 22,
                fontFamily: LBL_FONT,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                '& .MuiChip-icon': { color: '#fff', ml: '4px' },
              }}
            />
          )}
        </Stack>
        <Typography
          sx={{
            fontFamily: LBL_FONT,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            mb: 1.75,
          }}
        >
          {data ? 'Net profit · selected period' : 'Waiting for data…'}
        </Typography>

        {/* Supporting stats */}
        <Stack direction="row" spacing={0} sx={{ mb: 'auto' }}>
          {supportStats.map((stat, i) => (
            <Box
              key={stat.label}
              sx={{
                flex: 1,
                px: 1.5,
                py: 1,
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
              }}
            >
              <Typography sx={{ fontFamily: LBL_FONT, color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </Typography>
              <Typography sx={{ fontFamily: NUM_FONT, color: '#fff', fontSize: 14, fontWeight: 700, mt: 0.3, lineHeight: 1.2 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontFamily: LBL_FONT, color: 'rgba(255,255,255,0.45)', fontSize: 10, mt: 0.2 }}>
                {stat.sub}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Profit sparkline — edge-to-edge */}
        <Box sx={{ mx: -2.5, mb: -2.5, mt: 1.5 }}>
          {salesSeries.length > 1 ? (
            <Chart
              options={spkOpts}
              series={[{ name: 'Revenue', data: salesSeries }]}
              type="area"
              height={52}
            />
          ) : (
            <Box sx={{ height: 52, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '0 0 14px 14px' }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
