/**
 * Compact operational metric card.
 * Used above data tables for summary KPIs: today's sales, revenue, etc.
 */
import { Box, Card, Typography, Stack } from '@mui/material';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

export interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down'; value: string };
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function MetricCard({ label, value, trend, icon, onClick }: MetricCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 1.75,
        flex: '1 1 0',
        minWidth: 140,
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: '#fff',
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: '8px',
        boxShadow: 'none',
        transition: 'border-color 0.15s ease',
        '&:hover': onClick
          ? { borderColor: brand.primary[300] }
          : {},
      }}
    >
      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: brand.neutral[500],
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: '0.6875rem',
            }}
          >
            {label}
          </Typography>
          {icon && (
            <Box sx={{ color: brand.neutral[400], display: 'flex' }}>{icon}</Box>
          )}
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: brand.neutral[900],
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          {trend && (
            <Stack direction="row" alignItems="center" spacing={0.25}>
              {trend.direction === 'up' ? (
                <IconArrowUpRight size={12} color={brand.success.main} stroke={2.5} />
              ) : (
                <IconArrowDownRight size={12} color={brand.error.main} stroke={2.5} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: trend.direction === 'up' ? brand.success.dark : brand.error.dark,
                  fontSize: '0.6875rem',
                }}
              >
                {trend.value}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default MetricCard;
