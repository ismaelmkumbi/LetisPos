import React from 'react';
import { Box, Typography, Grid, Stack, Chip } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import { useDemoDialog } from '../components/DemoDialog';
import { pricingTiers, PricingTier, BillingPeriod } from './pricingData';

interface PricingDefaultProps {
  billing: BillingPeriod;
  tiers?: PricingTier[];
}

const PricingDefault: React.FC<PricingDefaultProps> = ({ billing, tiers }) => {
  const { openDemo } = useDemoDialog();
  const isAnnual = billing === 'annual';
  const activeTiers = tiers ?? pricingTiers;

  const getPrice = (tier: PricingTier): string => {
    if (isAnnual && tier.annualPrice && tier.annualPrice !== 'Custom') {
      return tier.annualPrice;
    }
    return tier.monthlyPrice;
  };

  const getPeriod = (tier: PricingTier): string => {
    if (isAnnual && tier.annualPrice && tier.annualPrice !== 'Custom') {
      return 'per year';
    }
    if (tier.annualPrice === 'Custom') {
      return 'per month';
    }
    return tier.period === '/year' ? 'per year' : 'per month';
  };

  const splitPrice = (price: string) => {
    if (price.startsWith('TZS ')) {
      return { currency: 'TZS', amount: price.slice(4) };
    }
    return { currency: '', amount: price };
  };

  const getCtaProps = (tier: PricingTier) => {
    if (tier.cta === 'Start free trial') {
      return { href: `/auth/login?plan=${tier.planCode}` };
    }
    if (tier.cta === 'Contact sales') {
      return { onClick: openDemo };
    }
    return {};
  };

  return (
    <Grid container spacing={3} alignItems="stretch">
      {activeTiers.map((tier) => {
        const price = splitPrice(getPrice(tier));
        const period = getPeriod(tier);

        return (
        <Grid key={tier.name} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Box
            sx={{
              p: { xs: 3, md: 3.25 },
              height: '100%',
              borderRadius: 2,
              bgcolor: 'var(--lp-surface)',
              border: tier.highlighted
                ? '2px solid var(--lp-accent)'
                : '1px solid var(--lp-border)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {tier.highlighted && (
              <Chip
                label="Most popular"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 18,
                  right: 22,
                  bgcolor: 'var(--lp-accent)',
                  color: '#fff',
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              />
            )}

            <Box
              sx={{
                minHeight: { xs: 86, md: 92 },
                pr: tier.highlighted ? 9 : 0,
                mb: { xs: 1, md: 1.25 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: { xs: '1.35rem', md: '1.45rem' },
                  fontWeight: 700,
                  lineHeight: 1.15,
                  mb: 1.1,
                }}
              >
                {tier.name}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.9rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.55,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {tier.description}
              </Typography>
            </Box>

            <Box
              sx={{
                mb: { xs: 1.75, md: 2 },
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderBottom: '1px solid var(--lp-border)',
                pb: { xs: 1.75, md: 2 },
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: { xs: 0.75, md: 0.9 },
                  lineHeight: 1,
                }}
              >
                {price.currency && (
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: { xs: '0.98rem', md: '1.05rem' },
                      fontWeight: 700,
                      color: 'var(--lp-text-muted)',
                      letterSpacing: 0,
                      lineHeight: 1,
                      transform: 'translateY(4px)',
                    }}
                  >
                    {price.currency}
                  </Typography>
                )}
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--lp-font-display)',
                    fontSize: { xs: '2.72rem', md: tier.highlighted ? '2.92rem' : '2.78rem' },
                    fontWeight: 800,
                    color: 'var(--lp-text)',
                    letterSpacing: 0,
                    lineHeight: 0.95,
                  }}
                >
                  {price.amount}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--lp-text-muted)',
                  mt: 1,
                  lineHeight: 1.2,
                }}
              >
                {period}
              </Typography>
            </Box>

            <Stack spacing={1.6} sx={{ mb: 3.5, flex: 1 }}>
              {tier.features.map((f) => (
                <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <IconCheck
                    size={18}
                    strokeWidth={2}
                    style={{ color: 'var(--lp-accent)', flexShrink: 0 }}
                  />
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

            <CtaButton variant={tier.ctaVariant} fullWidth {...getCtaProps(tier)}>
              {tier.cta}
            </CtaButton>
          </Box>
        </Grid>
        );
      })}
    </Grid>
  );
};

export default PricingDefault;
