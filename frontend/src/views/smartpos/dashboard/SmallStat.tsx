/**
 * SmallStat — used inside FinancialHealth and OperationsOverview.
 *
 * Changes:
 * - Outfit for label, JetBrains Mono for value (consistent with MetricCard)
 * - Tighter, cleaner layout — icon right-aligned, value prominent below label
 * - Replaced the "Live / selected period" footer with a subtle vs-period label
 * - Delta chip refined to match MetricCard style (border + color)
 */
import { Box, Chip, Stack, Typography } from '@mui/material';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { muted } from './utils';
import type { SmallStatProps } from './types';

const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";
const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";

const TONE_MAP = {
  success: { bg: brand.primary[50],       color: brand.primary[600],  darkBg: '#052e16' },
  warning: { bg: brand.warning.light,     color: brand.warning.main,  darkBg: '#451a03' },
  error:   { bg: brand.error.light,       color: brand.error.main,    darkBg: '#450a0a' },
  info:    { bg: brand.info.light,        color: brand.info.main,     darkBg: '#0c1a2e' },
  purple:  { bg: brand.purple.light,      color: brand.purple.main,   darkBg: '#2d1b69' },
};

export default function SmallStat({ label, value, tone, icon, delta, threshold }: SmallStatProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  const { bg, color, darkBg } = TONE_MAP[tone];
  const iconBg = isDark ? darkBg : bg;

  const valueColor =
    threshold === 'good'     ? brand.primary[isDark ? 400 : 600] :
    threshold === 'marginal' ? brand.warning.main :
    threshold === 'poor'     ? brand.error.main :
    isDark                   ? '#F1F5F9' : brand.neutral[900];

  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: '10px',
        border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        bgcolor: isDark ? brand.neutral[800] : '#fff',
        minHeight: { xs: 88, sm: 96 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Top row: label + icon */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography
          sx={{
            fontFamily: LBL_FONT,
            color: isDark ? brand.neutral[400] : brand.neutral[500],
            fontWeight: 600,
            fontSize: { xs: 10, sm: 11 },
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            lineHeight: 1.3,
            maxWidth: 'calc(100% - 44px)',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            bgcolor: iconBg,
            color,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {icon ?? <IconArrowUp size={16} />}
        </Box>
      </Stack>

      {/* Value + delta */}
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mt: 0.75 }}>
        <Typography
          sx={{
            fontFamily: NUM_FONT,
            color: valueColor,
            fontWeight: 700,
            fontSize: { xs: 15, sm: 17 },
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>
        {delta && (
          <Chip
            size="small"
            icon={delta.positive ? <IconArrowUp size={10} /> : <IconArrowDown size={10} />}
            label={`${delta.positive ? '+' : '−'}${delta.value.toFixed(1)}%`}
            sx={{
              height: 19,
              fontSize: 10,
              fontFamily: LBL_FONT,
              fontWeight: 700,
              bgcolor: delta.positive ? brand.primary[50] : '#FEF2F2',
              color: delta.positive ? brand.primary[700] : brand.error.main,
              border: `1px solid ${delta.positive ? brand.primary[100] : '#FECACA'}`,
              '& .MuiChip-icon': {
                color: delta.positive ? brand.primary[700] : brand.error.main,
                ml: '3px',
              },
            }}
          />
        )}
      </Stack>

      {/* Footer */}
      <Typography
        sx={{
          fontFamily: LBL_FONT,
          color: muted(isDark),
          fontSize: 10.5,
          mt: 0.5,
        }}
      >
        vs. previous period
      </Typography>
    </Box>
  );
}
