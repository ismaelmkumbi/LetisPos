import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import CtaButton from '../components/CtaButton';
import SectionWrapper from '../components/SectionWrapper';
import { useDemoDialog } from '../components/DemoDialog';

const FinalCta: React.FC = () => {
  const { openDemo } = useDemoDialog();

  return (
    <SectionWrapper>
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: 'center',
            py: { xs: 8, md: 12 },
            px: { xs: 3, md: 8 },
            borderRadius: 3,
            bgcolor: 'var(--lp-surface)',
            border: '1px solid var(--lp-border)',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: { xs: '1.75rem', md: '2.5rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Ready to run smarter?
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-body)',
              fontSize: '1.125rem',
              color: 'var(--lp-text-muted)',
              mb: 5,
              maxWidth: 480,
              mx: 'auto',
            }}
          >
            Join businesses already running on Letis. Start your free trial today — no credit card required.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <CtaButton variant="primary" href="/auth/register" size="large">
              Start free trial
            </CtaButton>
            <CtaButton variant="secondary" size="large" onClick={openDemo}>
              Book a demo
            </CtaButton>
          </Stack>
        </Box>
      </Container>
    </SectionWrapper>
  );
};

export default FinalCta;
