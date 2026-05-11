# Pricing Section Redesign — Design Spec

**Date:** 2026-05-11
**Status:** Approved
**Scope:** Replace the landing page pricing section with a 4-tier TZS-based pricing section targeting Tanzanian SMBs.

## Context

The current pricing section has 3 tiers in USD (Starter $29, Professional $79, Enterprise Custom). The business needs to reposition for the Tanzanian market with local currency (TZS), an additional "Business" tier, interactive annual/monthly toggle, and conversion-focused elements.

The existing landing page FAQ section (`sections/Faq.tsx`) stays untouched. Pricing-specific FAQs live inside the Pricing component.

## Design Direction

**Spotlight Cards** — 3 fused cards (Starter, Business, Professional) as one cohesive unit with the Business card elevated by a green glow and scale. Enterprise as an understated link row below. Clean, professional, no emojis — SVG icons from Tabler (already in the project).

## Component Architecture

### Modified file

`frontend/src/views/pages/landingpage/sections/Pricing.tsx` — full rewrite.

### Data structures (inline in Pricing.tsx)

```ts
interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  cta: 'Start free trial' | 'Contact sales';
  highlighted: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface TrustItem {
  label: string;
}
```

### Sub-components (all inline in Pricing.tsx)

- **Section header** — "Simple, transparent pricing" + subtitle
- **Launch offer badge** — checkmark icon + "30 days free + 50% off first 3 months" + "No credit card"
- **Billing toggle** — Monthly / Annual pill with "Save 2 months" tag on Annual
- **Spotlight card group** — 3 fused cards + Enterprise link row
- **Trust bar** — 5 check items in a row
- **FAQ accordion** — 5 pricing questions using MUI Accordion

## Pricing Plans

| Plan | Monthly | Annual | Highlight |
|------|---------|--------|-----------|
| Starter | TZS 15,000 | TZS 150,000 | No |
| Business | TZS 35,000 | TZS 350,000 | Yes ("Most Popular") |
| Professional | TZS 79,000 | TZS 790,000 | No |
| Enterprise | TZS 250,000+ | — | No (separate row) |

## Visual Specification

### Spotlight Card Group

- 3-column CSS grid: `1fr 1.25fr 1fr`
- Side cards (Starter, Professional): `bg: #111827`, `border: 1px solid #1E293B`, `border-radius: 12px` (outer edges only), no border on inner edges
- Business card: `background: linear-gradient(180deg, #0A1F12, #0F172A 60%)`, `border: 2px solid #4ADE80`, `border-radius: 16px`, `box-shadow: 0 0 48px rgba(74,222,128,0.15), 0 16px 48px rgba(0,0,0,0.5)`, slightly taller (margin-top: -8px, margin-bottom: -8px)
- Ambient glow behind center: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(74,222,128,0.06), transparent 70%)` via absolute positioned pseudo-element
- "Most Popular" chip: `background: #4ADE80`, `color: #0F172A`, rounded pill, positioned absolute top-center

### Enterprise Row

- Below the card group, centered
- Grid icon + "Enterprise plan starting at **TZS 250K/month** — Contact sales for unlimited everything, multi-company, API access, and SLA support."
- "Contact sales" is green, clickable, opens DemoDialog

### Launch Offer Badge

- `border: 1px solid rgba(74,222,128,0.18)`, `background: rgba(74,222,128,0.06)`, `border-radius: 8px`
- CheckCircle SVG icon (green) + label text
- Centered between header and toggle

### Billing Toggle

- `background: #1E293B`, `border-radius: 8px`
- Active: `background: #16A34A`, white text
- Inactive: `color: #94A3B8`
- "Save 2 months" tag on Annual: `background: rgba(74,222,128,0.15)`, `color: #4ADE80`, small border-radius

### Trust Bar

- Horizontal flex row, centered, wrapping on mobile
- Each item: check SVG + label text
- `color: #64748B`, `font-size: 10px`
- Separated from cards by `border-top: 1px solid #1E293B`

### FAQ Accordion

- MUI Accordion, `elevation={0}`, transparent background
- Custom expand icon: IconPlus from Tabler
- Dividers between items: `borderBottom: 1px solid var(--lp-border)`
- Questions: `fontFamily: var(--lp-font-body)`, `fontWeight: 500`, `fontSize: 12px`
- Answers: `color: var(--lp-text-muted)`, `fontSize: 12px`

### FAQ Content

1. **Can I try Letis POS for free?** — Yes! We offer a 30-day free trial with full access to all features in your chosen plan. No credit card required.
2. **Do I need a credit card to start?** — No. You can start your free trial without entering any payment information.
3. **Can I upgrade or downgrade my plan later?** — Absolutely. You can change your plan at any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.
4. **Do you provide local support in Tanzania?** — Yes. We have a local support team in Tanzania available via phone, WhatsApp, and email during business hours.
5. **Do the prices include VAT?** — Prices shown exclude VAT. VAT (18%) will be added at checkout where applicable.

## Theme Compatibility

All colors use `var(--lp-*)` CSS custom properties so the section adapts to all 3 landing page themes (refined-enterprise, bold-energetic, brutalist-honest). Hardcoded hex values are used only where the design intentionally diverges from theme tokens (e.g., the Business card's green glow which is brand-defining).

## Animation

- Section uses existing `SectionWrapper` (fade + slide up on scroll)
- Monthly/Annual toggle animates prices via CSS transition on toggle state change
- No card hover animations needed (the spotlight already draws attention)

## Responsive Behavior

- **Desktop (>= 900px):** 3-column fused card grid + Enterprise row
- **Tablet (600-899px):** Cards stack vertically as individual cards (not fused). Business still highlighted.
- **Mobile (< 600px):** Single column. All cards rounded on all sides. Enterprise as a card. FAQ accordion full width.

## Edge Cases

- Annual prices with TZS formatting: use `Intl.NumberFormat('en-TZ')` or manual `TZS X,XXX` format
- Enterprise pricing shows "Starting from TZS 250,000/month" — not a fixed price
- DemoDialog context available via `useDemoDialog()` for "Contact sales" CTA

## What Doesn't Change

- `SectionWrapper` component
- `CtaButton` component
- `DemoDialog` component
- `LandingpageTheme` / CSS variables system
- Existing `Faq.tsx` section
- `Landingpage.tsx` assembly file (Pricing import stays the same)
