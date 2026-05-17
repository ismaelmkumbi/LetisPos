import { Box, Chip, Stack, Typography } from '@mui/material';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { muted, titleColor } from './utils';
import type { SmallStatProps } from './types';

export default function SmallStat({ label, value, tone, icon, delta, threshold }: SmallStatProps) {
  const { activeMode: _s } = useContext(CustomizerContext);
  const isDark = _s === 'dark';
  const map = {
    success: { bg: brand.primary[50], color: brand.primary[600] },
    warning: { bg: brand.warning.light, color: brand.warning.main },
    error: { bg: brand.error.light, color: brand.error.main },
    info: { bg: brand.info.light, color: brand.info.main },
    purple: { bg: brand.purple.light, color: brand.purple.main },
  };
  const current = map[tone];
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '10px',
        border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        bgcolor: isDark ? brand.neutral[800] : '#fff',
        minHeight: 100,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography sx={{ color: brand.neutral[600], fontSize: 12 }}>{label}</Typography>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            bgcolor: current.bg,
            color: current.color,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon ?? <IconArrowUp size={18} />}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <Typography sx={{ color: threshold === 'good' ? brand.success.main
          : threshold === 'marginal' ? brand.warning.main
          : threshold === 'poor' ? brand.error.main
          : titleColor, fontWeight: 900, fontSize: 17 }}>
          {value}
        </Typography>
        {delta && (
          <Chip
            size="small"
            icon={delta.positive ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
            label={`${delta.positive ? '+' : '-'}${delta.value.toFixed(1)}%`}
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 800,
              bgcolor: delta.positive ? '#ECFDF5' : '#FEF2F2',
              color: delta.positive ? brand.primary[600] : brand.error.main,
              '& .MuiChip-icon': {
                color: delta.positive ? brand.primary[600] : brand.error.main,
                marginLeft: '4px',
              },
            }}
          />
        )}
      </Stack>
      <Typography
        sx={{
          color: tone === 'error' ? brand.error.main : brand.primary[600],
          fontSize: 12,
          fontWeight: 800,
          mt: 1,
        }}
      >
        Live{' '}
        <Box component="span" sx={{ color: muted(isDark), fontWeight: 500 }}>
          selected period
        </Box>
      </Typography>
    </Box>
  );
}
