import React from 'react';
import { Box, Typography, Grid, Stack, Chip } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import { useDemoDialog } from '../components/DemoDialog';
import { pricingTiers, PricingTier, BillingPeriod } from './pricingData';

interface PricingDefaultProps {
  billing: BillingPeriod;
}

const PricingDefault: React.FC<PricingDefaultProps> = ({ billing }) => {
  const { openDemo } = useDemoDialog();
  const isAnnual = billing === 'annual';

  const getPrice = (tier: PricingTier): string => {
    if (isAnnual && tier.annualPrice && tier.annualPrice !== 'Custom') {
      return tier.annualPrice;
    }
    return tier.monthlyPrice;
  };

  const getPeriod = (tier: PricingTier): string => {
    if (isAnnual && tier.annualPrice && tier.annualPrice !== 'Custom') {
      return '/year';
    }
    if (tier.annualPrice === 'Custom') {
      return '/month';
    }
    return tier.period;
  };

  const getCtaProps = (tier: PricingTier) => {
    if (tier.cta === 'Start free trial') {
      return { href: '/auth/register' };
    }
    if (tier.cta === 'Contact sales') {
      return { onClick: openDemo };
    }
    return {};
  };

  return (
    <Grid container spacing={3} alignItems="stretch">
      {pricingTiers.map((tier) => (
        <Grid key={tier.name} size={{ xs: 12, sm: 6, lg: 3 }}>
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
                {getPrice(tier)}
              </Typography>
              <Typography
                component="span"
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.938rem',
                  color: 'var(--lp-text-muted)',
                }}
              >
                {getPeriod(tier)}
              </Typography>
            </Box>

            <Stack spacing={2} sx={{ mb: 4, flex: 1 }}>
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
      ))}
    </Grid>
  );
};

export default PricingDefault;
