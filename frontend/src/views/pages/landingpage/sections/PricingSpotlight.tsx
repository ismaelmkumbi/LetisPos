import React from 'react';
import { Box, Typography } from '@mui/material';
import CtaButton from '../components/CtaButton';
import { useDemoDialog } from '../components/DemoDialog';
import { pricingTiers, PricingTier, BillingPeriod } from './pricingData';

interface PricingSpotlightProps {
  billing: BillingPeriod;
}

const GridSvg: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

const PricingSpotlight: React.FC<PricingSpotlightProps> = ({ billing }) => {
  const { openDemo } = useDemoDialog();
  const isAnnual = billing === 'annual';

  const spotlightTiers = pricingTiers.filter((t) => t.name !== 'Enterprise');

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

  const getBorderRadius = (index: number, total: number) => {
    if (index === 0) {
      return { xs: '16px', md: '12px 0 0 12px' };
    }
    if (index === total - 1) {
      return { xs: '16px', md: '0 12px 12px 0' };
    }
    return '16px';
  };

  return (
    <Box>
      {/* 3-Card Fused Grid */}
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.25fr 1fr' },
          maxWidth: 820,
          mx: 'auto',
          mb: 3,
        }}
      >
        {/* Ambient glow behind center card */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(74,222,128,0.06), transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {spotlightTiers.map((tier, index) => {
          const price = getPrice(tier);
          const period = getPeriod(tier);
          const currencyPrefix = 'TZS ';
          const priceValue = price.startsWith('TZS ')
            ? price.slice(4)
            : price;

          return (
            <Box
              key={tier.name}
              sx={{
                position: 'relative',
                zIndex: tier.highlighted ? 3 : 1,
                bgcolor: tier.highlighted ? undefined : '#111827',
                background: tier.highlighted
                  ? 'linear-gradient(180deg, #0A1F12, #0F172A 60%)'
                  : undefined,
                border: tier.highlighted
                  ? '2px solid #4ADE80'
                  : '1px solid #1E293B',
                borderRadius: getBorderRadius(index, spotlightTiers.length),
                borderRight:
                  !tier.highlighted && index === 0
                    ? { xs: '1px solid #1E293B', md: 'none' }
                    : undefined,
                borderLeft:
                  !tier.highlighted && index === spotlightTiers.length - 1
                    ? { xs: '1px solid #1E293B', md: 'none' }
                    : undefined,
                p: tier.highlighted
                  ? { xs: 4, md: '34px 24px' }
                  : { xs: 3, md: '28px 20px' },
                mt: tier.highlighted
                  ? { md: '-8px' }
                  : { md: '8px' },
                mb: tier.highlighted
                  ? { md: '-8px' }
                  : { xs: 2, md: 0 },
                boxShadow: tier.highlighted
                  ? {
                      xs: '0 0 24px rgba(74,222,128,0.1)',
                      md: '0 0 48px rgba(74,222,128,0.15), 0 16px 48px rgba(0,0,0,0.5)',
                    }
                  : undefined,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Most Popular badge */}
              {tier.highlighted && (
                <Box
                  sx={{
                    bgcolor: '#4ADE80',
                    color: '#0F172A',
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.563rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    px: 1.5,
                    py: '3px',
                    borderRadius: '100px',
                    mb: 1.5,
                    alignSelf: 'flex-start',
                  }}
                >
                  Most Popular
                </Box>
              )}

              {/* Plan name */}
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: tier.highlighted
                    ? '#4ADE80'
                    : 'var(--lp-text-muted)',
                  mb: 1.5,
                }}
              >
                {tier.name}
              </Typography>

              {/* Price */}
              <Box sx={{ mb: 0.5 }}>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--lp-font-display)',
                    fontSize: tier.highlighted ? '2.5rem' : '2.125rem',
                    fontWeight: 700,
                    color: tier.highlighted
                      ? 'var(--lp-text)'
                      : 'var(--lp-text)',
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: tier.highlighted ? '1.25rem' : '1.0625rem',
                      fontWeight: 600,
                    }}
                  >
                    {currencyPrefix}
                  </Box>
                  {priceValue}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    color: tier.highlighted
                      ? 'rgba(255,255,255,0.6)'
                      : 'var(--lp-text-muted)',
                    ml: 0.5,
                  }}
                >
                  {period}
                </Typography>
              </Box>

              {/* Divider */}
              <Box
                sx={{
                  width: '100%',
                  borderTop: tier.highlighted
                    ? '1px solid rgba(74,222,128,0.2)'
                    : '1px solid #1E293B',
                  my: 2,
                }}
              />

              {/* Features */}
              <Box sx={{ flex: 1, mb: 3 }}>
                {tier.features.map((feature) => (
                  <Typography
                    key={feature}
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.625rem',
                      color: tier.highlighted
                        ? 'var(--lp-text)'
                        : 'var(--lp-text-muted)',
                      lineHeight: 1.8,
                    }}
                  >
                    {feature}
                  </Typography>
                ))}
              </Box>

              {/* CTA */}
              <Box>
                <CtaButton
                  variant={tier.ctaVariant}
                  fullWidth
                  {...getCtaProps(tier)}
                  sx={
                    tier.highlighted
                      ? {
                          bgcolor: '#4ADE80 !important',
                          color: '#0F172A !important',
                          '&:hover': {
                            bgcolor: '#22C55E !important',
                            boxShadow:
                              '0 4px 12px rgba(74,222,128,0.3)',
                          },
                        }
                      : undefined
                  }
                >
                  {tier.cta}
                </CtaButton>
                {tier.highlighted && (
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.625rem',
                      color: 'var(--lp-text-muted)',
                      textAlign: 'center',
                      mt: 1,
                    }}
                  >
                    No credit card required
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Enterprise Link Row */}
      <Box sx={{ textAlign: 'center', mb: 0 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            color: 'var(--lp-text-muted)',
            fontFamily: 'var(--lp-font-body)',
            fontSize: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <GridSvg />
          <Box component="span">Enterprise plan starting at</Box>
          <Box
            component="span"
            sx={{ color: 'var(--lp-text)', fontWeight: 600 }}
          >
            TZS 250,000/month
          </Box>
          <Box component="span" sx={{ color: '#475569' }}>
            —
          </Box>
          <Box
            component="span"
            onClick={openDemo}
            sx={{
              color: '#4ADE80',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Contact sales
          </Box>
          <Box component="span">
            for unlimited everything, multi-company, API access, and SLA
            support.
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PricingSpotlight;
