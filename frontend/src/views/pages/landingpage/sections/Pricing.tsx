import React from 'react';
import { Box, Container, Typography, Grid, Stack, Chip } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import SectionWrapper from '../components/SectionWrapper';

const tiers = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for a single shop getting started.',
    features: [
      '1 POS terminal',
      'Single store',
      'Up to 3 users',
      'Inventory management',
      'Basic accounting',
      'Standard reports',
      'Email support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/month',
    description: 'For growing businesses with multiple locations.',
    features: [
      'Unlimited POS terminals',
      'Up to 5 stores',
      'Up to 10 users',
      'Advanced inventory',
      'Full accounting suite',
      'AI insights & predictions',
      'HRM & payroll',
      'Priority support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'primary' as const,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large retailers with complex needs.',
    features: [
      'Unlimited everything',
      'Unlimited stores',
      'Unlimited users',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise option',
      '24/7 phone support',
    ],
    cta: 'Book a demo',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
];

const Pricing: React.FC = () => {
  return (
    <SectionWrapper id="pricing">
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
            Simple, transparent pricing
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
            All core features included at every tier. Scale as you grow.
          </Typography>
        </Box>

        <Grid container spacing={3} alignItems="stretch">
          {tiers.map((tier) => (
            <Grid key={tier.name} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'var(--lp-surface)',
                  border: tier.highlighted
                    ? '2px solid var(--lp-accent)'
                    : '1px solid var(--lp-border)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {tier.highlighted && (
                  <Chip
                    label="Most popular"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: 'var(--lp-accent)',
                      color: '#fff',
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  />
                )}

                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    mb: 0.5,
                  }}
                >
                  {tier.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--lp-text-muted)',
                    mb: 3,
                  }}
                >
                  {tier.description}
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: 'var(--lp-font-display)',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {tier.price}
                  </Typography>
                  {tier.period && (
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.938rem',
                        color: 'var(--lp-text-muted)',
                      }}
                    >
                      {tier.period}
                    </Typography>
                  )}
                </Box>

                <Stack spacing={2} sx={{ mb: 4, flex: 1 }}>
                  {tier.features.map((f) => (
                    <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <IconCheck size={18} strokeWidth={2} style={{ color: 'var(--lp-accent)', flexShrink: 0 }} />
                      <Typography
                        sx={{
                          fontFamily: 'var(--lp-font-body)',
                          fontSize: '0.875rem',
                          color: 'var(--lp-text)',
                        }}
                      >
                        {f}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                <CtaButton variant={tier.ctaVariant} fullWidth>
                  {tier.cta}
                </CtaButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default Pricing;
