import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

const insights = [
  {
    title: 'Restock needed',
    detail: 'Cooking Oil — 12 units left. Estimated run-out in 4 days based on current sales velocity.',
    severity: 'high',
    color: '#F59E0B',
  },
  {
    title: 'Sales spike detected',
    detail: 'Rice 5kg sales up 40% this week vs. last. Consider increasing order quantity for next supplier run.',
    severity: 'info',
    color: '#3B82F6',
  },
  {
    title: 'Profit margin alert',
    detail: 'Milk category margin dropped 2.3% this month. Supplier price changed — review pricing.',
    severity: 'warning',
    color: '#EF4444',
  },
];

const AiInsightsMock: React.FC = () => {
  return (
    <Box
      sx={{
        bgcolor: 'var(--lp-surface)',
        borderRadius: 2,
        border: '1px solid var(--lp-border)',
        overflow: 'hidden',
        p: 2.5,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2.5,
          pb: 2,
          borderBottom: '1px solid var(--lp-border)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: 1,
              bgcolor: 'var(--lp-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              color: '#fff',
            }}
          >
            AI
          </Box>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: '0.813rem',
              fontWeight: 600,
              color: 'var(--lp-text)',
            }}
          >
            Insights — Today
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-body)',
            fontSize: '0.625rem',
            color: 'var(--lp-text-muted)',
          }}
        >
          Updated 3 min ago
        </Typography>
      </Box>

      {/* Insights list */}
      <Stack spacing={2}>
        {insights.map((insight) => (
          <Box
            key={insight.title}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              border: '1px solid var(--lp-border)',
              borderLeft: `3px solid ${insight.color}`,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--lp-text)',
                mb: 0.5,
              }}
            >
              {insight.title}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.625rem',
                color: 'var(--lp-text-muted)',
                lineHeight: 1.5,
              }}
            >
              {insight.detail}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Mini bar at bottom */}
      <Box
        sx={{
          mt: 2.5,
          pt: 2,
          borderTop: '1px solid var(--lp-border)',
          display: 'flex',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: 'var(--lp-font-body)', fontSize: '0.563rem', color: 'var(--lp-text-muted)', mb: 0.5 }}>
            Forecast accuracy
          </Typography>
          <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'var(--lp-border)' }}>
            <Box sx={{ width: '94%', height: '100%', borderRadius: 2, bgcolor: 'var(--lp-accent)' }} />
          </Box>
          <Typography sx={{ fontFamily: 'var(--lp-font-display)', fontSize: '0.625rem', fontWeight: 600, color: 'var(--lp-accent)', mt: 0.25 }}>
            94%
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: 'var(--lp-font-body)', fontSize: '0.563rem', color: 'var(--lp-text-muted)', mb: 0.5 }}>
            Alerts this week
          </Typography>
          <Typography sx={{ fontFamily: 'var(--lp-font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--lp-text)' }}>
            7
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: 'var(--lp-font-body)', fontSize: '0.563rem', color: 'var(--lp-text-muted)', mb: 0.5 }}>
            Time saved
          </Typography>
          <Typography sx={{ fontFamily: 'var(--lp-font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--lp-text)' }}>
            8.5h
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AiInsightsMock;
