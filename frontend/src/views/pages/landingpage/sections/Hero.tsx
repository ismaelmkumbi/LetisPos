import React from 'react';
import { Box, Container, Typography, Stack, Grid } from '@mui/material';
import {
  IconArrowRight,
  IconBuildingStore,
  IconCashRegister,
  IconCheck,
  IconPackage,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import DashboardMock from '../components/DashboardMock';
import { useDemoDialog } from '../components/DemoDialog';

const proofStats = [
  { value: '2 min', label: 'first sale setup' },
  { value: '24/7', label: 'sales visibility' },
  { value: '6+', label: 'business modules' },
];

const workModes = [
  { icon: <IconCashRegister size={17} />, label: 'POS terminal' },
  { icon: <IconPackage size={17} />, label: 'Live stock' },
  { icon: <IconShieldCheck size={17} />, label: 'Tenant safe' },
];

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
        pt: { xs: 4.5, md: 5 },
        pb: { xs: 6, md: 7 },
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 72% 24%, rgba(74, 222, 128, 0.12), transparent 32%), radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.12), transparent 28%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 4, md: 7 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                width: 'fit-content',
                px: 1.4,
                py: 0.75,
                mb: { xs: 2.5, md: 3 },
                border: '1px solid var(--lp-border)',
                borderRadius: '999px',
                bgcolor: 'rgba(255,255,255,0.04)',
              }}
            >
              <IconBuildingStore size={16} color="var(--lp-accent)" />
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--lp-text)',
                }}
              >
                Retail POS, inventory, money, and reports in one system
              </Typography>
            </Stack>
            <Typography
              variant="h1"
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: { xs: '2.35rem', sm: '3.4rem', md: '4.25rem' },
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: 0,
                maxWidth: 760,
                mb: 2.5,
              }}
            >
              Run every sale, stock move, and shilling from Letis POS.
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: { xs: '1.03rem', md: '1.18rem' },
                color: 'var(--lp-text-muted)',
                lineHeight: 1.65,
                maxWidth: 650,
                mb: 3.5,
              }}
            >
              A professional operating system for shops, pharmacies, electronics stores,
              supermarkets, and growing multi-branch teams.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
              <CtaButton
                variant="primary"
                href="/auth/register"
                size="large"
                endIcon={<IconArrowRight size={18} />}
                sx={{ minHeight: 50 }}
              >
                Start free trial
              </CtaButton>
              <CtaButton variant="secondary" size="large" onClick={openDemo} sx={{ minHeight: 50 }}>
                Book a demo
              </CtaButton>
            </Stack>

            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 3.5 }}>
              {workModes.map((mode) => (
                <Box
                  key={mode.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.4,
                    py: 0.75,
                    borderRadius: '50px',
                    border: '1px solid var(--lp-border)',
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.813rem',
                    color: 'var(--lp-text)',
                    bgcolor: 'rgba(255,255,255,0.035)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Box sx={{ display: 'flex', color: 'var(--lp-accent)' }}>{mode.icon}</Box>
                  {mode.label}
                </Box>
              ))}
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1.5, sm: 3 }}
              sx={{
                maxWidth: 620,
                p: { xs: 1.5, sm: 0 },
                borderRadius: '14px',
                bgcolor: { xs: 'rgba(255,255,255,0.035)', sm: 'transparent' },
                border: { xs: '1px solid var(--lp-border)', sm: '0' },
              }}
            >
              {proofStats.map((stat) => (
                <Box key={stat.label} sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <IconCheck size={16} color="var(--lp-accent)" />
                    <Typography
                      sx={{
                        fontFamily: 'var(--lp-font-display)',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: 'var(--lp-text)',
                      }}
                    >
                      {stat.value}
                    </Typography>
                  </Stack>
                  <Typography
                    sx={{
                      pl: 2.75,
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.76rem',
                      color: 'var(--lp-text-muted)',
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box id="product" sx={{ position: 'relative' }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  position: { xs: 'static', sm: 'absolute' },
                  zIndex: 2,
                  right: -10,
                  top: -20,
                  width: 'fit-content',
                  mb: { xs: 1.5, sm: 0 },
                  px: 1.5,
                  py: 1,
                  borderRadius: '12px',
                  bgcolor: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid var(--lp-border)',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.28)',
                }}
              >
                <IconUsers size={18} color="var(--lp-accent)" />
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Built for busy retail counters
                </Typography>
              </Stack>
              <DashboardMock />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Hero;
