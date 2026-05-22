import { Box, Typography } from '@mui/material';
import { LineChart, Line, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MetricPoint } from '../api/hub';
import { brand } from '../theme';

interface Props {
  metrics: MetricPoint[];
}

export default function CpuChart({ metrics }: Props) {
  const data = metrics.slice(-20).map((p) => ({
    time: new Date(p.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    cpu: p.cpuPercent?.toFixed(1),
  }));

  if (data.length < 2) {
    return (
      <Box sx={{ mb: 1, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.62rem' }}>
          Collecting metrics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 1, height: 65 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={brand.neutral[600]} />
          <Tooltip contentStyle={{ background: brand.neutral[800], border: `1px solid ${brand.neutral[600]}`, borderRadius: 8, color: brand.neutral[50], fontSize: 11 }} />
          <Line type="monotone" dataKey="cpu" stroke={brand.info.main} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
