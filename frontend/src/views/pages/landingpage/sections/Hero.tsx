import React from 'react';
import { Box, Container, Typography, Stack, Grid } from '@mui/material';
import CtaButton from '../components/CtaButton';
import DashboardMock from '../components/DashboardMock';
import { useDemoDialog } from '../components/DemoDialog';

const Hero: React.FC = () => {
  const { openDemo } = useDemoDialog();

  return (
    <Box
      sx={{
        bgcolor: 'var(--lp-hero-bg)',
        color: 'var(--lp-hero-text)',
        minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
        display: 'flex',
        alignItems: 'center',
        pt: { xs: 8, md: 0 },
        pb: { xs: 8, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              variant="h1"
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                mb: 3,
              }}
            >
              Run your entire business from one place
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: { xs: '1.125rem', md: '1.25rem' },
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                maxWidth: 560,
                mb: 5,
              }}
            >
              POS, inventory, accounting, and AI insights — unified without compromise.
              Letis gives you every tool you need to run a modern retail operation.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <CtaButton variant="primary" href="/auth/register" size="large">
                Start free trial
              </CtaButton>
              <CtaButton variant="secondary" size="large" onClick={openDemo}>
                Book a demo
              </CtaButton>
            </Stack>

            <Stack direction="row" spacing={1.5} mt={5} flexWrap="wrap" useFlexGap>
              {['POS Terminal', 'Inventory', 'Accounting', 'AI Reports', 'HRM', 'Multi-store'].map((badge) => (
                <Box
                  key={badge}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: '50px',
                    border: '1px solid var(--lp-border)',
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.813rem',
                    color: 'var(--lp-text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge}
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)', borderRadius: 2 }}>
              <DashboardMock />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Hero;
