import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

interface Metric {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

const metrics: Metric[] = [
  { label: 'Today Sales', value: '$4,280', change: '+12.4%', positive: true },
  { label: 'Stock Items', value: '1,247', change: '-3 low', positive: false },
  { label: 'Active Orders', value: '18', change: '+4 new', positive: true },
];

const recentSales = [
  { item: 'Milk 500ml x3', price: '$5.40', time: '2m ago' },
  { item: 'Bread Loaf x2', price: '$3.80', time: '8m ago' },
  { item: 'Cooking Oil 1L', price: '$7.20', time: '14m ago' },
  { item: 'Rice 5kg', price: '$12.50', time: '22m ago' },
];

const DashboardMock: React.FC = () => {
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
      {/* Top bar */}
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
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-display)',
            fontSize: '0.813rem',
            fontWeight: 600,
            color: 'var(--lp-text)',
          }}
        >
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--lp-accent)' }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--lp-border)' }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--lp-border)' }} />
        </Box>
      </Box>

      {/* Metric pills */}
      <Stack direction="row" spacing={1.5} mb={2.5}>
        {metrics.map((m) => (
          <Box
            key={m.label}
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: 'var(--lp-accent-soft)',
              border: '1px solid var(--lp-border)',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--lp-text-muted)',
                mb: 0.5,
              }}
            >
              {m.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--lp-text)',
                mb: 0.25,
              }}
            >
              {m.value}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: m.positive ? 'var(--lp-accent)' : '#F59E0B',
              }}
            >
              {m.change}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* Mini chart bar */}
      <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 48 }}>
        {[40, 65, 45, 80, 55, 90, 70, 60, 75, 85, 50, 95].map((h, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: `${h}%`,
              borderRadius: '2px',
              bgcolor: i === 11 ? 'var(--lp-accent)' : 'var(--lp-accent-soft)',
              transition: 'height 0.3s ease',
            }}
          />
        ))}
      </Box>
      <Typography
        sx={{
          fontFamily: 'var(--lp-font-body)',
          fontSize: '0.625rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--lp-text-muted)',
          mb: 1.5,
        }}
      >
        Recent sales
      </Typography>

      {/* Recent sales */}
      <Stack spacing={0.75}>
        {recentSales.map((sale) => (
          <Box
            key={sale.item}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.75,
              px: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'var(--lp-accent-soft)' },
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.688rem',
                color: 'var(--lp-text)',
                fontWeight: 500,
              }}
            >
              {sale.item}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '0.688rem',
                  fontWeight: 600,
                  color: 'var(--lp-text)',
                }}
              >
                {sale.price}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.563rem',
                  color: 'var(--lp-text-muted)',
                }}
              >
                {sale.time}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default DashboardMock;
