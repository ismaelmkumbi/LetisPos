/**
 * Compact operational status dot + label.
 * Used across Sales Desk for register state, row status, workflow steps.
 */
import { Box, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export type OperationalState = 'idle' | 'active' | 'attention' | 'critical' | 'closed';

export interface StatusIndicatorProps {
  state: OperationalState;
  label: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: { dot: 7, fontSize: '0.6875rem', gap: 0.75 },
  md: { dot: 9, fontSize: '0.75rem', gap: 1 },
} as const;

export function StatusIndicator({ state, label, pulse, size = 'md' }: StatusIndicatorProps) {
  const token = brand.operational[state];
  const s = SIZES[size];

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: s.gap }}>
      <Box
        sx={{
          width: s.dot,
          height: s.dot,
          borderRadius: '50%',
          backgroundColor: token.dot,
          flexShrink: 0,
          ...(pulse && state === 'active'
            ? {
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1, boxShadow: `0 0 0 0 ${token.dot}40` },
                  '50%': { opacity: 0.7, boxShadow: `0 0 0 4px ${token.dot}20` },
                },
              }
            : {}),
        }}
      />
      <Typography
        variant={size === 'sm' ? 'caption' : 'body2'}
        sx={{
          fontWeight: 600,
          color: token.text,
          fontSize: s.fontSize,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default StatusIndicator;
