# Pricing Section Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page pricing section with a 4-tier TZS-based pricing component featuring spotlight cards, interactive billing toggle, launch offer badge, trust bar, and FAQ accordion.

**Architecture:** Single-file rewrite of `Pricing.tsx`. All data (plans, FAQs, trust items) defined as typed constants at module level. Component composes: section header, launch badge, billing toggle (useState), 3-card spotlight group + enterprise link row, trust bar, FAQ accordion. Uses existing SectionWrapper, CtaButton, and DemoDialog components.

**Tech Stack:** React 19, TypeScript, MUI v7, Tabler Icons, framer-motion (via SectionWrapper)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/views/pages/landingpage/sections/Pricing.tsx` | Rewrite | Complete pricing section component + all data structures |

All other files (SectionWrapper, CtaButton, DemoDialog, Landingpage.tsx, theme system) are unchanged.

---

### Task 1: Define data structures and content

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx` (rewrite)

- [ ] **Step 1: Replace Pricing.tsx with typed data structures and skeleton component**

Replace the entire file with:

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
import {
  IconCheck,
  IconPlus,
} from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';
import SectionWrapper from '../components/SectionWrapper';
import { useDemoDialog } from '../components/DemoDialog';

// --- Data ---

interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  ctaLabel: string;
  highlighted: boolean;
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    description: 'Perfect for small shops and startups.',
    monthlyPrice: 15000,
    annualPrice: 150000,
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
    ctaLabel: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Business',
    description: 'Perfect for growing businesses.',
    monthlyPrice: 35000,
    annualPrice: 350000,
    features: [
      'Up to 3 Stores',
      'Unlimited POS Terminals',
      'Up to 10 Users',
      'Advanced Inventory',
      'Accounting',
      'CRM',
      'Priority Support',
    ],
    ctaLabel: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Professional',
    description: 'Perfect for established businesses.',
    monthlyPrice: 79000,
    annualPrice: 790000,
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
    ctaLabel: 'Start free trial',
    highlighted: false,
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
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

const trustItems: string[] = [
  '30-Day Free Trial',
  'No Credit Card Required',
  'Cancel Anytime',
  'Free Onboarding',
  'Local Support in Tanzania',
];

// --- Helpers ---

// --- Icons ---

const CheckSvg: React.FC = () => (
  <IconCheck size={14} strokeWidth={2.5} style={{ color: '#4ADE80', flexShrink: 0 }} />
);

const PlusSvg: React.FC = () => (
  <IconPlus size={14} strokeWidth={2} style={{ color: 'var(--lp-text-muted)' }} />
);

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

// --- Component ---

const Pricing: React.FC = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const { openDemo } = useDemoDialog();

  const isAnnual = billing === 'annual';

  return (
    <SectionWrapper id="pricing">
      <Container maxWidth="lg">
        {/* TODO: Tasks 2–7 will fill this in */}
        <Typography sx={{ color: 'var(--lp-text)' }}>Pricing placeholder</Typography>
      </Container>
    </SectionWrapper>
  );
};

export default Pricing;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx. (There may be pre-existing errors elsewhere — ignore those.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add data structures and skeleton for pricing redesign"
```

---

### Task 2: Build section header and launch offer badge

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Replace the placeholder with header + badge**

Replace the `{/* TODO: Tasks 2–7 will fill this in */}` block and its parent `<Typography>` with:

```tsx
{/* Section Header */}
<Box sx={{ textAlign: 'center', mb: 3 }}>
  <Typography
    sx={{
      fontFamily: 'var(--lp-font-display)',
      fontSize: { xs: '2rem', md: '2.75rem' },
      fontWeight: 700,
      letterSpacing: '-0.02em',
      mb: 1.5,
    }}
  >
    Simple, transparent pricing
  </Typography>
  <Typography
    sx={{
      fontFamily: 'var(--lp-font-body)',
      fontSize: '1.125rem',
      color: 'var(--lp-text-muted)',
      maxWidth: 420,
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
      bgcolor: 'rgba(74,222,128,0.06)',
      border: '1px solid rgba(74,222,128,0.18)',
      borderRadius: '8px',
      px: 2.5,
      py: 1,
    }}
  >
    <IconCheck size={14} strokeWidth={2.5} style={{ color: '#4ADE80', flexShrink: 0 }} />
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
      </Box>
      {' '}· No credit card
    </Typography>
  </Box>
</Box>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add section header and launch offer badge"
```

---

### Task 3: Build billing toggle

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Add the billing toggle after the launch badge**

Insert after the launch offer badge's closing `</Box>` (before the placeholder cleanup area):

```tsx
{/* Billing Toggle */}
<Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
  <Box
    sx={{
      display: 'flex',
      bgcolor: 'var(--lp-surface)',
      borderRadius: '8px',
      p: '3px',
      gap: '2px',
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
        color: !isAnnual ? '#fff' : 'var(--lp-text-muted)',
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
        color: isAnnual ? '#fff' : 'var(--lp-text-muted)',
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
          bgcolor: 'rgba(74,222,128,0.15)',
          color: '#4ADE80',
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add monthly/annual billing toggle"
```

---

### Task 4: Build the spotlight card group (3 fused cards)

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Add the 3-card spotlight group after the billing toggle**

Insert after the billing toggle's closing `</Box>`:

```tsx
{/* Spotlight Card Group */}
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

  {plans.map((plan) => {
    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

    return (
      <Box
        key={plan.name}
        sx={{
          position: 'relative',
          zIndex: plan.highlighted ? 3 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          bgcolor: plan.highlighted ? 'transparent' : '#111827',
          background: plan.highlighted
            ? 'linear-gradient(180deg, #0A1F12, #0F172A 60%)'
            : undefined,
          borderRadius: {
            xs: '16px',
            md: plan.name === 'Starter'
              ? '12px 0 0 12px'
              : plan.name === 'Professional'
                ? '0 12px 12px 0'
                : '16px',
          },
          border: plan.highlighted
            ? '2px solid #4ADE80'
            : { xs: '1px solid #1E293B', md: '1px solid #1E293B' },
          borderRight:
            !plan.highlighted && plan.name === 'Starter'
              ? { xs: '1px solid #1E293B', md: 'none' }
              : undefined,
          borderLeft:
            !plan.highlighted && plan.name === 'Professional'
              ? { xs: '1px solid #1E293B', md: 'none' }
              : undefined,
          boxShadow: plan.highlighted
            ? {
                xs: '0 0 24px rgba(74,222,128,0.1)',
                md: '0 0 48px rgba(74,222,128,0.15), 0 16px 48px rgba(0,0,0,0.5)',
              }
            : undefined,
          mt: plan.highlighted ? { md: '-8px' } : { md: '8px' },
          mb: plan.highlighted ? { md: '-8px' } : { md: '8px' },
          p: plan.highlighted
            ? { xs: 4, md: '34px 24px' }
            : { xs: 3, md: '28px 20px' },
          mb: { xs: 2, md: undefined },
        }}
      >
        {/* Most Popular chip */}
        {plan.highlighted && (
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

        {/* Plan name */}
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-body)',
            fontSize: '0.625rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: plan.highlighted ? '#4ADE80' : 'var(--lp-text-muted)',
            mb: 1.5,
          }}
        >
          {plan.name}
        </Typography>

        {/* Price */}
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-display)',
            fontSize: plan.highlighted ? '2.5rem' : '2.125rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            mb: 0.5,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: plan.highlighted ? '1.125rem' : '1rem',
              fontWeight: 500,
              color: 'var(--lp-text-muted)',
            }}
          >
            TZS{' '}
          </Box>
          {isAnnual
            ? (price / 1000).toLocaleString('en-TZ')
            : price.toLocaleString('en-TZ')}
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

        {/* Divider */}
        <Box
          sx={{
            width: '100%',
            borderTop: plan.highlighted
              ? '1px solid rgba(74,222,128,0.2)'
              : '1px solid #1E293B',
            my: 2,
          }}
        />

        {/* Features */}
        <Box sx={{ flex: 1, mb: 3, width: '100%' }}>
          {plan.features.map((feature) => (
            <Typography
              key={feature}
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.625rem',
                color: plan.highlighted ? 'var(--lp-text)' : 'var(--lp-text-muted)',
                lineHeight: 1.6,
              }}
            >
              {feature}
            </Typography>
          ))}
        </Box>

        {/* CTA */}
        <Box sx={{ width: '100%', mt: 'auto' }}>
          <CtaButton
            variant={plan.highlighted ? 'primary' : 'secondary'}
            fullWidth
            href={plan.ctaLabel === 'Start free trial' ? '/auth/register' : undefined}
            onClick={plan.ctaLabel === 'Contact sales' ? openDemo : undefined}
            sx={
              plan.highlighted
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
            {plan.ctaLabel}
          </CtaButton>
          {plan.highlighted && (
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add 3-card spotlight group with fused layout"
```

---

### Task 5: Build Enterprise link row and trust bar

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Add Enterprise row and trust bar after the spotlight card group**

Insert after the spotlight card group's closing `</Box>`:

```tsx
{/* Enterprise Row */}
<Box sx={{ textAlign: 'center', mb: 3 }}>
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

{/* Trust Bar */}
<Box
  sx={{
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: { xs: 1.5, md: 3.5 },
    py: 2,
    borderTop: '1px solid var(--lp-border)',
    mb: 4,
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
        fontSize: '0.625rem',
      }}
    >
      <CheckSvg />
      {item}
    </Box>
  ))}
</Box>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add enterprise link row and trust bar"
```

---

### Task 6: Build FAQ accordion

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Add FAQ section after the trust bar**

Insert after the trust bar's closing `</Box>`:

```tsx
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

  {faqs.map((faq, idx) => (
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
          <IconPlus size={14} strokeWidth={2} style={{ color: 'var(--lp-text-muted)' }} />
        }
        sx={{
          py: 0.5,
          '& .MuiAccordionSummary-content': { my: 1.5 },
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-body)',
            fontSize: '0.75rem',
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
            fontSize: '0.75rem',
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "feat(pricing): add pricing FAQ accordion"
```

---

### Task 7: Final review and cleanup

**Files:**
- Modify: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Review the complete file for consistency**

Read the full file and check:
- All imports are used (no unused imports)
- No hardcoded placeholder text remains
- `formatTzs` helper is used for price display (verify it's called in the price rendering)
- The billing toggle state (`isAnnual`) correctly switches prices
- `openDemo` is wired to both Enterprise "Contact sales" and any "Book a demo" CTAs
- Section markup is well-formed (no unclosed tags)

- [ ] **Step 2: Remove any unused code**

Scan the file for unused imports or variables. Remove any that aren't referenced.

- [ ] **Step 3: Final TypeScript check**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to Pricing.tsx.

- [ ] **Step 4: Start dev server and visually verify**

Run: `cd frontend && npm run dev` (or check if the dev server is already running)

Navigate to the landing page at `/landingpage` and verify:
- Pricing section renders with all 4 tiers
- Monthly/Annual toggle switches prices correctly
- Business card is highlighted with green glow and "Most Popular" chip
- Enterprise "Contact sales" opens the demo dialog
- "Start free trial" buttons link to `/auth/register`
- Trust bar shows 5 items with check icons
- FAQ accordion expands/collapses on click
- Section is responsive — single column on mobile
- All 3 themes work (toggle via the floating theme button)

- [ ] **Step 5: Commit final cleanup**

```bash
git add frontend/src/views/pages/landingpage/sections/Pricing.tsx
git commit -m "chore(pricing): final cleanup and review"
```
