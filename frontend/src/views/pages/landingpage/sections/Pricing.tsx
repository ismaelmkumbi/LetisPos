import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';
import PricingDefault from './PricingDefault';
import PricingSpotlight from './PricingSpotlight';
import { pricingFaqs, trustItems, BillingPeriod, pricingTiers, plansToTiers, type PricingTier } from './pricingData';
import { listPlans } from 'src/api/smartpos/billing';

export type PricingVariant = 'default' | 'spotlight';

export interface PricingProps {
  variant?: PricingVariant;
}

const Pricing: React.FC<PricingProps> = ({ variant = 'default' }) => {
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [tiers, setTiers] = useState<PricingTier[]>(pricingTiers);
  const [, setLoading] = useState(true);
  const isAnnual = billing === 'annual';

  useEffect(() => {
    listPlans()
      .then(plans => { if (plans.length > 0) setTiers(plansToTiers(plans)); })
      .catch(() => { /* keep hardcoded fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const PricingCards = variant === 'spotlight' ? PricingSpotlight : PricingDefault;

  return (
    <SectionWrapper id="pricing">
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
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
            All core features included. Scale as you grow — no surprises.
          </Typography>
        </Box>

        {/* Launch Offer Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'var(--lp-surface)',
              border: '1px solid var(--lp-border)',
              borderRadius: 2,
              px: 2.5,
              py: 1,
            }}
          >
            <IconCheck
              size={14}
              strokeWidth={2.5}
              style={{ color: 'var(--lp-accent)', flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.813rem',
                color: 'var(--lp-text-muted)',
              }}
            >
              Launch offer —{' '}
              <Box component="span" sx={{ color: 'var(--lp-text)', fontWeight: 600 }}>
                30 days free + 50% off your first 3 months
              </Box>{' '}
              · No credit card
            </Typography>
          </Box>
        </Box>

        {/* Billing Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
          <Box
            sx={{
              display: 'flex',
              bgcolor: 'var(--lp-surface)',
              borderRadius: 2,
              p: '3px',
              gap: '2px',
              border: '1px solid var(--lp-border)',
            }}
          >
            <Box
              onClick={() => setBilling('monthly')}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '6px',
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.813rem',
                fontWeight: 600,
                color: !isAnnual ? 'var(--lp-cta-text)' : 'var(--lp-text-muted)',
                bgcolor: !isAnnual ? 'var(--lp-accent)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Monthly
            </Box>
            <Box
              onClick={() => setBilling('annual')}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '6px',
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.813rem',
                fontWeight: 600,
                color: isAnnual ? 'var(--lp-cta-text)' : 'var(--lp-text-muted)',
                bgcolor: isAnnual ? 'var(--lp-accent)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              Annual
              <Box
                component="span"
                sx={{
                  bgcolor: 'var(--lp-accent-soft)',
                  color: 'var(--lp-accent)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  px: 1,
                  py: '2px',
                  borderRadius: '4px',
                }}
              >
                Save 2 months
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Pricing Cards — variant-specific */}
        <Box sx={{ mb: 6 }}>
          <PricingCards billing={billing} tiers={tiers} />
        </Box>

        {/* Trust Bar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: { xs: 1.5, md: 3.5 },
            py: 2,
            borderTop: '1px solid var(--lp-border)',
            mb: 6,
          }}
        >
          {trustItems.map((item) => (
            <Box
              key={item}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                color: 'var(--lp-text-muted)',
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.75rem',
              }}
            >
              <IconCheck
                size={14}
                strokeWidth={2.5}
                style={{ color: 'var(--lp-accent)', flexShrink: 0 }}
              />
              {item}
            </Box>
          ))}
        </Box>

        {/* FAQ Accordion */}
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              fontWeight: 700,
              textAlign: 'center',
              mb: 3,
            }}
          >
            Frequently asked questions
          </Typography>

          {pricingFaqs.map((faq, idx) => (
            <Accordion
              key={idx}
              elevation={0}
              sx={{
                bgcolor: 'transparent',
                borderBottom: '1px solid var(--lp-border)',
                '&:before': { display: 'none' },
                '&:first-of-type': { borderTop: '1px solid var(--lp-border)' },
              }}
            >
              <AccordionSummary
                expandIcon={
                  <IconPlus
                    size={14}
                    strokeWidth={2}
                    style={{ color: 'var(--lp-text-muted)' }}
                  />
                }
                sx={{
                  py: 0.5,
                  '& .MuiAccordionSummary-content': { my: 1.5 },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--lp-text-muted)',
                    lineHeight: 1.7,
                    pb: 1.5,
                  }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </SectionWrapper>
  );
};

export default Pricing;
