import React from 'react';
import { Box, Container, Typography, Grid, Stack } from '@mui/material';
import { IconTrendingUp, IconAlertTriangle, IconFileReport } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';
import AiInsightsMock from '../components/AiInsightsMock';

const capabilities = [
  {
    icon: <IconTrendingUp size={24} strokeWidth={1.5} />,
    title: 'Sales forecasting',
    description: "Predict next week's revenue based on historical patterns, seasonality, and current trends.",
  },
  {
    icon: <IconAlertTriangle size={24} strokeWidth={1.5} />,
    title: 'Smart reorder alerts',
    description: 'Get notified when stock hits critical levels — before you run out. AI learns your lead times.',
  },
  {
    icon: <IconFileReport size={24} strokeWidth={1.5} />,
    title: 'Automated reports',
    description: 'Daily, weekly, or monthly summaries generated and delivered automatically. No manual work.',
  },
];

const AiHighlight: React.FC = () => {
  return (
    <SectionWrapper>
      <Container maxWidth="lg">
        <Grid container spacing={8} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: { xs: '2rem', md: '2.75rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                mb: 2,
              }}
            >
              AI that works for you
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '1.125rem',
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Letis Pos Assistant analyzes your sales and inventory data to surface what matters — predictions, alerts, and insights — so you can focus on running your business.
            </Typography>
            <Stack spacing={3}>
              {capabilities.map((cap) => (
                <Box key={cap.title} sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ color: 'var(--lp-accent)', flexShrink: 0, mt: 0.5 }}>
                    {cap.icon}
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: 'var(--lp-font-display)',
                        fontSize: '1.063rem',
                        fontWeight: 600,
                        mb: 0.5,
                      }}
                    >
                      {cap.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.938rem',
                        color: 'var(--lp-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {cap.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <AiInsightsMock />
          </Grid>
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default AiHighlight;
