import { Box, Tooltip, Typography } from '@mui/material';
import { IconGauge } from '@tabler/icons-react';
import { useBrandPerformance } from 'src/branding/hooks/useBrandPerformance';

/**
 * Dev-only performance indicator showing brand load pipeline timings.
 * Renders nothing in production builds.
 */
export default function PerfIndicator() {
  const metrics = useBrandPerformance();

  if (!metrics) return null;

  const color = metrics.totalMs < 100 ? '#22C55E' : metrics.totalMs < 300 ? '#F59E0B' : '#EF4444';

  return (
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700 }}>Brand Load Pipeline</Typography>
          <Typography sx={{ fontSize: '0.58rem' }}>Profile: {metrics.profileLoadMs}ms</Typography>
          <Typography sx={{ fontSize: '0.58rem' }}>Tokens: {metrics.tokenComputeMs}ms</Typography>
          <Typography sx={{ fontSize: '0.58rem' }}>CSS Inject: {metrics.cssInjectMs}ms</Typography>
        </Box>
      }
      arrow
    >
      <Box
        sx={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 0.5,
          px: 1, py: 0.25, borderRadius: '6px',
          bgcolor: 'rgba(0,0,0,0.75)', cursor: 'pointer',
        }}
      >
        <IconGauge size={12} color={color} />
        <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
          {metrics.totalMs}ms
        </Typography>
      </Box>
    </Tooltip>
  );
}
