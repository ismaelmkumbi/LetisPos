import { useState, useEffect } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { IconChartBar, IconFileInvoice, IconEdit, IconTrendingUp } from '@tabler/icons-react';
import { useBrand } from 'src/context/smartpos/BrandContext';

interface AnalyticsData {
  documentsGenerated: number;
  templatesUsed: number;
  changesThisMonth: number;
  healthScore: number;
  healthTrend: 'up' | 'down' | 'stable';
}

export default function BrandAnalyticsCard() {
  const { profile } = useBrand();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // For MVP, compute simple analytics from available data
  useEffect(() => {
    if (!profile) return;
    setAnalytics({
      documentsGenerated: 0,    // Requires document-service integration
      templatesUsed: 43,         // All built-in types available
      changesThisMonth: 0,       // Requires version history count
      healthScore: 0,            // Requires health-score API call
      healthTrend: 'stable',
    });
    setLoading(false);
  }, [profile]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 2 }}>
        <CircularProgress size={20} sx={{ color: 'var(--bp-color-primary, #16A34A)' }} />
      </Stack>
    );
  }

  if (!analytics) return null;

  const metrics = [
    { icon: <IconFileInvoice size={18} />, label: 'Documents', value: analytics.documentsGenerated },
    { icon: <IconChartBar size={18} />, label: 'Templates', value: analytics.templatesUsed },
    { icon: <IconEdit size={18} />, label: 'Changes (month)', value: analytics.changesThisMonth },
    { icon: <IconTrendingUp size={18} />, label: 'Health', value: analytics.healthScore },
  ];

  return (
    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--bp-border-default, #E2E8F0)' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <IconChartBar size={18} color="var(--bp-color-primary, #16A34A)" />
        <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>Brand Analytics</Typography>
      </Stack>
      <Stack direction="row" spacing={2}>
        {metrics.map((m) => (
          <Box key={m.label} sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: '8px', bgcolor: 'var(--bp-surface-page, #F8FAFC)' }}>
            <Box sx={{ color: 'var(--bp-text-secondary, #64748B)', mb: 0.25, '& svg': { width: 16, height: 16 } }}>{m.icon}</Box>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 900 }}>{m.value}</Typography>
            <Typography sx={{ fontSize: '0.55rem', color: 'var(--bp-text-secondary, #64748B)', fontWeight: 600 }}>{m.label}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
