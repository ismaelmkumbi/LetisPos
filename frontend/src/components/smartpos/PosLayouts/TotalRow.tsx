import { useContext } from 'react';
/**
 * TotalRow — single line of a financial summary.
 * Used by checkout panels and payment screens across all layouts.
 */
import { Stack, Typography } from '@mui/material';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface TotalRowProps {
  label: string;
  value: string | number;
  labelWeight?: number;
  valueWeight?: number;
  valueColor?: string;
  size?: 'small' | 'medium';
}

export default function TotalRow({ label, value, labelWeight = 600, valueWeight = 700, valueColor, size = 'medium' }: TotalRowProps) {
  const { activeMode: _pos } = useContext(CustomizerContext);
  const isDark = _pos === 'dark';
  const isSmall = size === 'small';
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography
        sx={{
          fontWeight: labelWeight,
          fontSize: isSmall ? '0.82rem' : '0.9rem',
          color: isDark ? brand.neutral[300] : brand.neutral[700],
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: valueWeight,
          fontSize: isSmall ? '0.82rem' : '0.9rem',
          color: valueColor ?? brand.neutral[900],
          letterSpacing: '-0.01em',
        }}
      >
        {typeof value === 'number' ? fmt(value) : value}
      </Typography>
    </Stack>
  );
}
