import React from 'react';
import { Box, Typography, Stack, SxProps, Theme } from '@mui/material';
import {
  IconBrain,
  IconPackage,
  IconTrendingUp,
  IconUsers,
} from '@tabler/icons-react';

const aiBenefits = [
  {
    icon: <IconBrain size={22} />,
    title: 'AI business insights',
    text: 'Understand sales, profit, and trends in real time.',
  },
  {
    icon: <IconPackage size={22} />,
    title: 'Smart inventory alerts',
    text: 'Know what to restock before the shelf goes empty.',
  },
  {
    icon: <IconTrendingUp size={22} />,
    title: 'Sales recommendations',
    text: 'See products to upsell and actions to grow revenue.',
  },
  {
    icon: <IconUsers size={22} />,
    title: 'Customer intelligence',
    text: 'Build stronger relationships from every transaction.',
  },
];

export type BenefitTone = 'dark' | 'light';

interface BenefitListProps {
  dense?: boolean;
  sx?: SxProps<Theme>;
  tone?: BenefitTone;
}

const BenefitList: React.FC<BenefitListProps> = ({ dense = false, sx, tone = 'dark' }) => (
  <Stack spacing={dense ? 1.45 : 2.2} sx={sx}>
    {aiBenefits.map((benefit) => (
      <Stack key={benefit.title} direction="row" spacing={1.7} alignItems="flex-start">
        <Box
          sx={{
            width: dense ? 44 : 48,
            height: dense ? 44 : 48,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: '#E7F8EE',
            color: '#16A34A',
            flexShrink: 0,
            boxShadow: 'inset 0 0 0 1px rgba(22, 163, 74, 0.08)',
          }}
        >
          {benefit.icon}
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: dense ? '0.94rem' : '0.98rem',
              fontWeight: 900,
              color: tone === 'dark' ? '#F8FAFC' : '#0F172A',
              mb: 0.35,
            }}
          >
            {benefit.title}
          </Typography>
          <Typography
            sx={{
              fontSize: dense ? '0.86rem' : '0.9rem',
              color: tone === 'dark' ? '#CBD5E1' : '#52637A',
              lineHeight: 1.5,
            }}
          >
            {benefit.text}
          </Typography>
        </Box>
      </Stack>
    ))}
  </Stack>
);

export default BenefitList;
