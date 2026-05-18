/**
 * BusinessPulseCard — executive profit card.
 *
 * Design intent:
 * - Profit is the lead business signal, but the surface stays calm.
 * - Loss uses a soft semantic red treatment with a strong value color.
 * - Same card language as the KPI strip so the dashboard reads as one system.
 */
import {
  Box, Card, CardContent, Chip, Stack, Typography,
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { formatMoney } from 'src/utils/smartpos/currency';
import { darkToneBg, PERIOD_LABELS, profitMargin } from './utils';
import type { Dashboard, Period } from 'src/api/smartpos/reports';
import type { Delta } from './types';
import { brand } from 'src/theme/smartpos/brand';

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
  const pulseBars   = salesSeries.slice(-12);
  const pulseMax    = Math.max(...pulseBars, 1);

  const tone = isLoss
    ? {
        accent: brand.error.dark,
        accentSoft: '#FEF2F2',
        border: '#FCA5A5',
        text: '#7F1D1D',
        muted: '#B45353',
      }
    : {
        accent: brand.primary[700],
        accentSoft: brand.primary[50],
        border: brand.primary[200],
        text: brand.primary[900],
        muted: brand.primary[700],
      };

  const surface = isDark
    ? isLoss ? '#2A1113' : '#0B2418'
    : isLoss ? '#FFF7F7' : '#F7FDF9';

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
        minHeight: { xs: 164, sm: 170 },
        borderRadius: '12px',
        background: surface,
        border: `1px solid ${isDark ? brand.neutral[700] : tone.border}`,
        borderLeft: `4px solid ${tone.accent}`,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isDark ? 'none' : '0 10px 30px rgba(15,23,42,0.055)',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.25 }, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Header row */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.25 }}>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              color: isDark ? brand.neutral[400] : brand.neutral[500],
              fontSize: { xs: 10.5, sm: 11 },
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              pr: 1,
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
              bgcolor: isDark ? `${tone.accent}22` : tone.accentSoft,
              color: tone.accent,
              border: `1px solid ${tone.border}`,
              '& .MuiChip-icon': { color: tone.accent, ml: '4px' },
            }}
          />
        </Stack>

        {/* Net Profit — hero number */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 0.6, minWidth: 0, flexWrap: 'wrap' }}
        >
          <Typography
            sx={{
              color: isDark ? '#F8FAFC' : isLoss ? brand.error.dark : brand.neutral[900],
              fontWeight: 800,
              fontSize: { xs: 'clamp(1.7rem, 8vw, 2.05rem)', sm: 31 },
              lineHeight: 1,
              maxWidth: '100%',
              overflowWrap: 'anywhere',
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
              bgcolor: isDark ? (delta.positive ? darkToneBg.success : darkToneBg.error) : delta.positive ? brand.primary[50] : '#FEF2F2',
              color: delta.positive ? brand.primary[isDark ? 300 : 700] : brand.error[isDark ? 'main' : 'dark'],
              border: `1px solid ${isDark ? (delta.positive ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)') : delta.positive ? brand.primary[100] : '#FECACA'}`,
              '& .MuiChip-icon': { color: delta.positive ? brand.primary[isDark ? 300 : 700] : brand.error[isDark ? 'main' : 'dark'], ml: '4px' },
            }}
          />
        )}
        </Stack>
        <Typography
          sx={{
            fontFamily: LBL_FONT,
            color: isDark ? brand.neutral[400] : tone.muted,
            fontSize: 12,
            mb: 1.5,
          }}
        >
          {data ? (isLoss ? 'Net loss needs review this period' : 'Net profit for selected period') : 'Waiting for data...'}
        </Typography>

        {/* Supporting stats */}
        <Stack direction="row" spacing={0} sx={{ mt: 'auto' }}>
          {supportStats.map((stat, i) => (
            <Box
              key={stat.label}
              sx={{
                flex: 1,
                px: i === 0 ? 0 : 1.3,
                py: 0.75,
                borderLeft: i > 0 ? `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}` : 'none',
              }}
            >
              <Typography sx={{ fontFamily: LBL_FONT, color: isDark ? brand.neutral[500] : brand.neutral[500], fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </Typography>
              <Typography sx={{ color: isDark ? '#F8FAFC' : tone.text, fontSize: 14, fontWeight: 800, mt: 0.3, lineHeight: 1.2 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontFamily: LBL_FONT, color: isDark ? brand.neutral[500] : brand.neutral[400], fontSize: 10, mt: 0.2 }}>
                {stat.sub}
              </Typography>
            </Box>
          ))}
        </Stack>

        {pulseBars.length > 1 && (
          <Stack direction="row" spacing={0.4} alignItems="flex-end" sx={{ height: 18, mt: 1.15 }}>
            {pulseBars.map((value, index) => (
              <Box
                key={`${value}-${index}`}
                sx={{
                  flex: 1,
                  height: `${Math.max(18, (value / pulseMax) * 100)}%`,
                  borderRadius: '2px 2px 0 0',
                  bgcolor: isDark ? `${tone.accent}77` : `${tone.accent}33`,
                }}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
