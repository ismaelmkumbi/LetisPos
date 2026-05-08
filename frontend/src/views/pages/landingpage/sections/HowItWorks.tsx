import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import { IconUserPlus, IconPackages, IconCash } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const steps = [
  {
    step: '01',
    icon: <IconUserPlus size={32} strokeWidth={1.5} />,
    title: 'Create your account',
    description: 'Sign up in 30 seconds. Choose your plan. No credit card needed to start.',
  },
  {
    step: '02',
    icon: <IconPackages size={32} strokeWidth={1.5} />,
    title: 'Add your products',
    description: 'Import your inventory, set prices, configure taxes. Bulk import supported.',
  },
  {
    step: '03',
    icon: <IconCash size={32} strokeWidth={1.5} />,
    title: 'Start selling',
    description: 'Open the POS terminal and start processing sales. Your inventory and accounts update automatically.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <SectionWrapper>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Get running in minutes
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-body)',
              fontSize: '1.125rem',
              color: 'var(--lp-text-muted)',
              maxWidth: 480,
              mx: 'auto',
            }}
          >
            From sign-up to first sale — no training required.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="flex-start"
        >
          {steps.map((s) => (
            <Box key={s.step} sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '3rem',
                  fontWeight: 700,
                  color: 'var(--lp-accent-soft)',
                  lineHeight: 1,
                  mb: 2,
                  WebkitTextStroke: '1px var(--lp-accent)',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {s.step}
              </Typography>
              <Box sx={{ color: 'var(--lp-accent)', mb: 2 }}>{s.icon}</Box>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {s.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.938rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {s.description}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </SectionWrapper>
  );
};

export default HowItWorks;
