import { Box, Typography } from '@mui/material';
import { LineChart, Line, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MetricPoint } from '../api/hub';
import { brand } from '../theme';

interface Props {
  metrics: MetricPoint[];
}

export default function CpuChart({ metrics }: Props) {
  const data = metrics.slice(-30).map((p) => ({
    time: new Date(p.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    cpu: p.cpuPercent?.toFixed(1),
  }));

  if (data.length < 2) {
    return (
      <Box sx={{ mb: 2, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.72rem' }}>
          Insufficient data — collecting metrics
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2, height: 100 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={brand.neutral[600]} />
          <Tooltip contentStyle={{ background: brand.neutral[800], border: `1px solid ${brand.neutral[600]}`, borderRadius: 10, color: brand.neutral[50], fontSize: 12 }} />
          <Line type="monotone" dataKey="cpu" stroke={brand.info.main} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
