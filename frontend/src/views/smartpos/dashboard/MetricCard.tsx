/**
 * MetricCard — redesigned for visual authority.
 * - Outfit for label, JetBrains Mono for the number
 * - Left accent strip per metric color
 * - Taller sparkline (58px) fills the card bottom edge-to-edge
 * - Delta chip inline with value
 * - Hover: translateY(-3px) + depth shadow
 */
import {
  Box, Card, CardActionArea, CardContent, Chip,
  Stack, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { sparkOptions } from './utils';
import EmptyPanel from './EmptyPanel';
import type { MetricCardProps } from './types';

const NUM_FONT  = "'JetBrains Mono', 'DM Mono', 'Fira Code', monospace";
const LBL_FONT  = "'Outfit', 'DM Sans', sans-serif";

export default function MetricCard({
  label, value, icon, color, series, delta, onClick,
}: MetricCardProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const theme   = useTheme();
  const isXs    = useMediaQuery(theme.breakpoints.down('sm'));
  const spkH    = isXs ? 44 : 58;

  const borderColor = isDark ? brand.neutral[700] : brand.neutral[200];

  const cardBase = {
    position: 'relative' as const,
    height: '100%',
    border: `1px solid ${borderColor}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '14px',
    bgcolor: isDark ? brand.neutral[800] : '#FFFFFF',
    boxShadow: isDark
      ? 'none'
      : '0 1px 4px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.04)',
    overflow: 'hidden' as const,
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  };

  const content = (
    <CardContent
      sx={{
        p: { xs: '14px 14px 0', sm: '18px 18px 0' },
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: { xs: 168, sm: 200 },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: { xs: 34, sm: 40 },
          height: { xs: 34, sm: 40 },
          borderRadius: '10px',
          bgcolor: `${color}15`,
          color,
          display: 'grid',
          placeItems: 'center',
          mb: 1.5,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      {/* Label */}
      <Typography
        sx={{
          fontFamily: LBL_FONT,
          color: isDark ? brand.neutral[400] : brand.neutral[500],
          fontWeight: 600,
          fontSize: { xs: 10.5, sm: 11.5 },
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          mb: 0.6,
        }}
      >
        {label}
      </Typography>

      {/* Value + Delta */}
      <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
        <Typography
          sx={{
            fontFamily: NUM_FONT,
            color: isDark ? '#F1F5F9' : brand.neutral[900],
            fontWeight: 700,
            fontSize: { xs: 19, sm: 23 },
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>
        {delta && (
          <Chip
            size="small"
            icon={delta.positive ? <IconArrowUp size={11} /> : <IconArrowDown size={11} />}
            label={`${delta.positive ? '+' : '−'}${delta.value.toFixed(1)}%`}
            sx={{
              height: 21,
              fontSize: 10.5,
              fontFamily: LBL_FONT,
              fontWeight: 700,
              bgcolor: delta.positive ? brand.primary[50] : '#FEF2F2',
              color: delta.positive ? brand.primary[700] : brand.error.dark,
              border: `1px solid ${delta.positive ? brand.primary[100] : '#FECACA'}`,
              '& .MuiChip-icon': {
                color: delta.positive ? brand.primary[700] : brand.error.dark,
                ml: '4px',
              },
            }}
          />
        )}
      </Stack>

      <Typography
        sx={{
          fontFamily: LBL_FONT,
          color: isDark ? brand.neutral[600] : brand.neutral[400],
          fontSize: 11,
          mt: 0.5,
          mb: 1,
        }}
      >
        vs. previous period
      </Typography>

      {/* Sparkline — edge-to-edge bottom */}
      <Box sx={{ mt: 'auto', mx: '-18px', mb: 0 }}>
        {series.length > 1 ? (
          <Chart
            options={{
              ...sparkOptions(color),
              chart: { type: 'area', sparkline: { enabled: true }, toolbar: { show: false } },
              fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 95] },
              },
              stroke: { curve: 'smooth', width: 2 },
            }}
            series={[{ name: label, data: series }]}
            type="area"
            height={spkH}
          />
        ) : (
          <EmptyPanel title="" subtitle="" height={spkH} compact />
        )}
      </Box>
    </CardContent>
  );

  if (onClick) {
    return (
      <Card
        elevation={0}
        sx={{
          ...cardBase,
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: isDark
              ? '0 8px 28px rgba(0,0,0,0.35)'
              : `0 10px 28px rgba(15,23,42,0.10), 0 0 0 1px ${color}25`,
            borderLeftColor: color,
          },
        }}
      >
        <CardActionArea
          onClick={onClick}
          sx={{ height: '100%', '& .MuiCardActionArea-focusHighlight': { bgcolor: `${color}08` } }}
        >
          {content}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={cardBase}>
      {content}
    </Card>
  );
}
