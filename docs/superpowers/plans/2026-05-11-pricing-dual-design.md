# Pricing Section — Dual Design with Switch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two pricing designs in the codebase — "Default" (minimal update, keeps existing card patterns) and "Spotlight" (fused cards with glow) — with a switch mechanism to toggle between them at runtime.

**Architecture:** The `Pricing` component accepts a `variant` prop (`'default' | 'spotlight'`). Both variants share the same data (pricing plans, FAQs, trust items) extracted into a shared data file. The landing page imports `Pricing` with the desired variant. A floating toggle (dev-only) allows switching during review.

**Tech Stack:** React 19, TypeScript, MUI v7, Tabler Icons, framer-motion

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/views/pages/landingpage/sections/Pricing.tsx` | Rewrite | Main component — `variant` prop switches between Default and Spotlight sub-components |
| `frontend/src/views/pages/landingpage/sections/pricingData.ts` | **Create** | Shared data: plans, FAQs, trust items, types |
| `frontend/src/views/pages/landingpage/Landingpage.tsx` | Modify | Pass `variant` prop (hardcoded for now, easy to flip) |

---

### Task 1: Extract shared pricing data

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/pricingData.ts`

- [ ] **Step 1: Create the shared data file**

```ts
export interface PricingTier {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaVariant: 'primary' | 'secondary';
  highlighted: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    monthlyPrice: 'TZS 15K',
    annualPrice: 'TZS 150K',
    period: '/month',
    description: 'Perfect for small shops and startups.',
    features: [
      '1 Store',
      '1 POS Terminal',
      'Up to 2 Users',
      'Inventory Management',
      'Sales & Purchases',
      'Basic Reports',
      'Customer Management',
      'WhatsApp Receipts',
      'Email Support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
  {
    name: 'Business',
    monthlyPrice: 'TZS 35K',
    annualPrice: 'TZS 350K',
    period: '/month',
    description: 'Perfect for growing businesses.',
    features: [
      'Up to 3 Stores',
      'Unlimited POS Terminals',
      'Up to 10 Users',
      'Advanced Inventory',
      'Accounting',
      'CRM',
      'Priority Support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'primary' as const,
    highlighted: true,
  },
  {
    name: 'Professional',
    monthlyPrice: 'TZS 79K',
    annualPrice: 'TZS 790K',
    period: '/month',
    description: 'Perfect for established businesses.',
    features: [
      'Up to 10 Stores',
      'Unlimited Users',
      'Full Accounting Suite',
      'HR & Payroll',
      'CRM',
      'AI Business Insights',
      'Advanced Reports',
      'Approval Workflows',
      'Priority Support',
    ],
    cta: 'Start free trial',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'TZS 250K',
    annualPrice: 'Custom',
    period: '/month',
    description: 'For supermarkets and large organizations.',
    features: [
      'Unlimited Stores',
      'Unlimited Users',
      'Multi-Company Support',
      'API Access',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Support',
    ],
    cta: 'Contact sales',
    ctaVariant: 'secondary' as const,
    highlighted: false,
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const pricingFaqs: FaqItem[] = [
  {
    question: 'Can I try Letis POS for free?',
    answer:
      'Yes! We offer a 30-day free trial with full access to all features in your chosen plan. No credit card required.',
  },
  {
    question: 'Do I need a credit card to start?',
    answer:
      'No. You can start your free trial without entering any payment information.',
  },
  {
    question: 'Can I upgrade or downgrade my plan later?',
    answer:
      'Absolutely. You can change your plan at any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.',
  },
  {
    question: 'Do you provide local support in Tanzania?',
    answer:
      'Yes. We have a local support team in Tanzania available via phone, WhatsApp, and email during business hours.',
  },
  {
    question: 'Do the prices include VAT?',
    answer:
      'Prices shown exclude VAT. VAT (18%) will be added at checkout where applicable.',
  },
];

export const trustItems: string[] = [
  '30-Day Free Trial',
  'No Credit Card Required',
  'Cancel Anytime',
  'Free Onboarding',
  'Local Support in Tanzania',
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/pricingData.ts
git commit -m "feat(pricing): extract shared pricing data into separate file"
```

---

### Task 2: Build the Default variant (keeps current card design)

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/PricingDefault.tsx`

- [ ] **Step 1: Create PricingDefault.tsx — minimal update of original**

```tsx
import React from 'react';
import { Box, Typography, Grid, Stack, Chip } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import { useDemoDialog } from '../components/DemoDialog';
import { pricingTiers, PricingTier } from './pricingData';

interface PricingDefaultProps {
  billing: 'monthly' | 'annual';
}

const PricingDefault: React.FC<PricingDefaultProps> = ({ billing }) => {
  const { openDemo } = useDemoDialog();
  const isAnnual = billing === 'annual';

  return (
    <Grid container spacing={3} alignItems="stretch">
      {pricingTiers.map((tier: PricingTier) => (
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
                {isAnnual && tier.name !== 'Enterprise'
                  ? tier.annualPrice
                  : tier.monthlyPrice}
              </Typography>
              {tier.name !== 'Enterprise' && (
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.938rem',
                    color: 'var(--lp-text-muted)',
                  }}
                >
                  {isAnnual ? '/year' : tier.period}
                </Typography>
              )}
            </Box>

            <Stack spacing={2} sx={{ mb: 4, flex: 1 }}>
              {tier.features.map((f: string) => (
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

            <CtaButton
              variant={tier.ctaVariant}
              fullWidth
              onClick={tier.cta === 'Contact sales' ? openDemo : undefined}
              href={tier.cta === 'Start free trial' ? '/auth/register' : undefined}
            >
              {tier.cta}
            </CtaButton>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default PricingDefault;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/PricingDefault.tsx
git commit -m "feat(pricing): add Default variant — keeps existing card design"
```

---

### Task 3: Build the Spotlight variant

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/PricingSpotlight.tsx`

- [ ] **Step 1: Create PricingSpotlight.tsx — fused cards with glow**

```tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import { useDemoDialog } from '../components/DemoDialog';
import { pricingTiers, PricingTier } from './pricingData';

interface PricingSpotlightProps {
  billing: 'monthly' | 'annual';
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

  // Split tiers: first 3 in spotlight, Enterprise separate
  const spotlightTiers = pricingTiers.filter((t) => t.name !== 'Enterprise');
  const enterpriseTier = pricingTiers.find((t) => t.name === 'Enterprise')!;

  return (
    <>
      {/* Spotlight Card Group — 3 fused cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.25fr 1fr' },
          gap: 0,
          maxWidth: 820,
          mx: 'auto',
          mb: 3,
          position: 'relative',
          alignItems: 'start',
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

        {spotlightTiers.map((tier: PricingTier) => {
          const price =
            isAnnual && tier.name !== 'Enterprise'
              ? tier.annualPrice
              : tier.monthlyPrice;

          const isFirst = tier.name === 'Starter';
          const isLast = tier.name === 'Professional';

          return (
            <Box
              key={tier.name}
              sx={{
                position: 'relative',
                zIndex: tier.highlighted ? 3 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                bgcolor: tier.highlighted ? 'transparent' : '#111827',
                background: tier.highlighted
                  ? 'linear-gradient(180deg, #0A1F12, #0F172A 60%)'
                  : undefined,
                borderRadius: {
                  xs: '16px',
                  md: isFirst
                    ? '12px 0 0 12px'
                    : isLast
                      ? '0 12px 12px 0'
                      : '16px',
                },
                border: tier.highlighted
                  ? '2px solid #4ADE80'
                  : '1px solid #1E293B',
                borderRight:
                  !tier.highlighted && isFirst
                    ? { xs: '1px solid #1E293B', md: 'none' }
                    : undefined,
                borderLeft:
                  !tier.highlighted && isLast
                    ? { xs: '1px solid #1E293B', md: 'none' }
                    : undefined,
                boxShadow: tier.highlighted
                  ? {
                      xs: '0 0 24px rgba(74,222,128,0.1)',
                      md: '0 0 48px rgba(74,222,128,0.15), 0 16px 48px rgba(0,0,0,0.5)',
                    }
                  : undefined,
                mt: tier.highlighted ? { md: '-8px' } : { md: '8px' },
                mb: { xs: 2, md: tier.highlighted ? '-8px' : '8px' },
                p: tier.highlighted
                  ? { xs: 4, md: '34px 24px' }
                  : { xs: 3, md: '28px 20px' },
              }}
            >
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
                  }}
                >
                  Most Popular
                </Box>
              )}

              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: tier.highlighted ? '#4ADE80' : 'var(--lp-text-muted)',
                  mb: 1.5,
                }}
              >
                {tier.name}
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: tier.highlighted ? '2.5rem' : '2.125rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 0.5,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontSize: tier.highlighted ? '1.125rem' : '1rem',
                    fontWeight: 500,
                    color: 'var(--lp-text-muted)',
                  }}
                >
                  TZS{' '}
                </Box>
                {price}
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.688rem',
                    color: 'var(--lp-text-muted)',
                    fontWeight: 400,
                    ml: 0.25,
                  }}
                >
                  /{isAnnual ? 'year' : 'month'}
                </Box>
              </Typography>

              <Box
                sx={{
                  width: '100%',
                  borderTop: tier.highlighted
                    ? '1px solid rgba(74,222,128,0.2)'
                    : '1px solid #1E293B',
                  my: 2,
                }}
              />

              <Box sx={{ flex: 1, mb: 3, width: '100%' }}>
                {tier.features.map((feature: string) => (
                  <Typography
                    key={feature}
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.625rem',
                      color: tier.highlighted
                        ? 'var(--lp-text)'
                        : 'var(--lp-text-muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature}
                  </Typography>
                ))}
              </Box>

              <Box sx={{ width: '100%', mt: 'auto' }}>
                <CtaButton
                  variant={tier.highlighted ? 'primary' : 'secondary'}
                  fullWidth
                  href={
                    tier.cta === 'Start free trial' ? '/auth/register' : undefined
                  }
                  onClick={tier.cta === 'Contact sales' ? openDemo : undefined}
                  sx={
                    tier.highlighted
                      ? {
                          bgcolor: '#4ADE80 !important',
                          color: '#0F172A !important',
                          '&:hover': {
                            bgcolor: '#22C55E !important',
                            boxShadow: '0 4px 12px rgba(74,222,128,0.3)',
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
                      mt: 0.75,
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

      {/* Enterprise Row */}
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
          <Box component="span" sx={{ color: 'var(--lp-text)', fontWeight: 600 }}>
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
            for unlimited everything, multi-company, API access, and SLA support.
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default PricingSpotlight;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/PricingSpotlight.tsx
git commit -m "feat(pricing): add Spotlight variant — fused cards with green glow"
```

---

### Task 4: Rewrite Pricing.tsx with variant switch + shared shell

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx` (rewrite)

- [ ] **Step 1: Rewrite Pricing.tsx as the orchestrator**

```tsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';
import PricingDefault from './PricingDefault';
import PricingSpotlight from './PricingSpotlight';
import { pricingFaqs, trustItems } from './pricingData';

export type PricingVariant = 'default' | 'spotlight';

interface PricingProps {
  variant?: PricingVariant;
}

const Pricing: React.FC<PricingProps> = ({ variant = 'default' }) => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const isAnnual = billing === 'annual';

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
          <PricingCards billing={billing} />
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

export type { PricingProps };
export default Pricing;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add variant switch — 'default' | 'spotlight'"
```

---

### Task 5: Update Landingpage.tsx to pass the variant

**Files:**
- Modify: `frontend/src/views/pages/landingpage/Landingpage.tsx`

- [ ] **Step 1: Pass variant prop to Pricing**

Find the `<Pricing />` line in Landingpage.tsx and change it to:

```tsx
<Pricing variant="default" />
```

(To switch designs, change `"default"` to `"spotlight"`.)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/Landingpage.tsx
git commit -m "feat(pricing): wire Pricing variant into landing page"
```

---

### Task 6: Visual verification — both variants

- [ ] **Step 1: Start dev server**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: Test Default variant**

Navigate to `/landingpage`:
- [ ] 4 cards in grid (Starter, Business, Professional, Enterprise)
- [ ] Business is highlighted with "Most popular" chip
- [ ] Monthly/Annual toggle works
- [ ] All `var(--lp-*)` colors — switch themes to verify
- [ ] Trust bar + FAQ render correctly
- [ ] Responsive: 4-col → 2×2 → 1-col

- [ ] **Step 3: Test Spotlight variant**

Change `variant="default"` to `variant="spotlight"` in Landingpage.tsx, refresh:
- [ ] 3 fused cards + Enterprise row below
- [ ] Business card has green glow and gradient
- [ ] "Most Popular" pill badge
- [ ] Toggle still works
- [ ] Responsive: fused → stacked

- [ ] **Step 4: Fix any issues and commit**

```bash
git add -A
git commit -m "fix(pricing): visual QA fixes for both variants"
```

---

## How to Switch Designs

In `Landingpage.tsx`, change one line:

```tsx
<Pricing variant="default" />   // ← current card design, minimal changes
<Pricing variant="spotlight" />  // ← fused cards with green glow
```

Later, when you decide which is default, just keep that value.
