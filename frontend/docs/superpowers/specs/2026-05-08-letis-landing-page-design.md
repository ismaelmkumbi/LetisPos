# Letis POS — Landing Page Design

## Context

The current landing page (`/landingpage`) is a generic admin-template placeholder that advertises the template framework ("6 Theme Colors", "JWT + Firebase Auth", "65+ Page Templates") rather than selling Letis POS. It needs to be replaced with a world-class landing page that communicates what Letis actually does and converts visitors.

Letis is a comprehensive POS platform: point of sale, inventory, accounting, purchases, HRM, reports, AI insights, multi-store — all in one system.

## Approach

**One landing page, three switchable visual themes.** Same content and section structure across themes. A theme toggle lets visitors switch, with one set as default. This allows A/B testing and stakeholder selection without building three separate pages.

The three themes:

1. **Refined Enterprise** — Dark, editorial, premium. Georgia serif, slate palette, precision spacing. Trust-driven.
2. **Bold & Energetic** — Bright green on white, gradient accents, system fonts. High-energy startup feel.
3. **Brutalist Honest** — High-contrast, monospace, thick borders. Anti-generic-SaaS, memorable.

## Target Audience

All business owners — small shops to medium/large retailers. Dual CTA strategy: self-serve "Start free trial" for small shops + "Book a demo" for larger retailers.

## Section Flow

### 1. Header / Nav

- Sticky, minimal. Logo left, nav links center (Features, Pricing), dual CTA buttons right.
- No dropdown menus. Clean and fast.

### 2. Hero

- Headline: "Run your entire business from one place"
- Subtext: POS, inventory, accounting, and AI insights — unified without compromise.
- Dual CTA: "Start free trial" (primary) + "Book a demo" (secondary)
- Right side: animated dashboard mockup or terminal showing Letis in action
- Highest-investment section — typography, motion, and visual must be exceptional

### 3. Trust Bar / Capability Badges

- "Everything you need to run a modern retail business"
- Badge-style pills: POS Terminal, Inventory, Accounting, AI Reports, HRM, Multi-store
- Real capabilities, not fake logos

### 4. Core Modules Grid

- "Everything included" — 8 module cards in asymmetric/staggered grid
- Cards: Point of Sale, Inventory Management, Accounting, Purchases & Suppliers, Reports & Analytics, AI Insights, HRM & Payroll, Multi-store
- Each card: icon, title, one-line description. Visual differentiation between cards.

### 5. How It Works

- 3 steps: Create account (30s) → Add products → Start selling
- Timeline or connected cards. Simple, fast.

### 6. AI Feature Highlight

- "AI That Works For You" — deeper dive into AI capabilities
- Smart inventory predictions, sales forecasting, automated reports
- Split layout: text left, visual/illustration right

### 7. Testimonials

- Carousel or masonry grid of quotes
- Focus on outcomes: time saved, revenue growth

### 8. Pricing

- 3 tiers: Starter, Professional, Enterprise
- Annual/monthly toggle. Starter tier has prominent "Start free" CTA.

### 9. FAQ

- Accordion. 5–6 questions: offline use, hardware, data migration, support, security.

### 10. Final CTA

- "Ready to run smarter?" — full-width, bold. Dual CTA, no distractions.

### 11. Footer

- Logo, copyright, social links, stacked nav (Products, Company, Legal).

## Technical Decisions

- **Framework**: React 19 + TypeScript (already in project)
- **UI Library**: MUI 7 (already in project)
- **Animation**: framer-motion (already in project) for scroll-triggered reveals, staggered animations, and theme transitions
- **Routing**: Add `Landingpage` route at `/` (currently redirects to dashboard). Keep `/landingpage` as alias.
- **Theme Switching**: CSS custom properties + data attributes on `<body>`. Theme state managed via React context. No MUI theme dependency — landing page has its own design system.
- **Performance**: Lazy-loaded below-fold sections. Hero renders immediately.
- **Responsive**: Mobile-first, breakpoints at 768px and 1024px.

## File Structure

```
frontend/src/views/pages/landingpage/
  Landingpage.tsx          — main page, composition of sections
  LandingpageTheme.tsx     — theme context + provider
  themes/
    refined-enterprise.ts  — theme tokens
    bold-energetic.ts      — theme tokens
    brutalist-honest.ts    — theme tokens
  sections/
    Header.tsx
    Hero.tsx
    TrustBar.tsx
    ModulesGrid.tsx
    HowItWorks.tsx
    AiHighlight.tsx
    Testimonials.tsx
    Pricing.tsx
    Faq.tsx
    FinalCta.tsx
    Footer.tsx
  components/
    ThemeToggle.tsx
    CtaButton.tsx
    ModuleCard.tsx
    TestimonialCard.tsx
    PricingCard.tsx
```

## What We're NOT Doing

- Not modifying the existing admin dashboard or smartpos routes
- Not adding backend dependencies
- Not removing the old landing page components yet (they stay in `components/landingpage/` as reference until the new page ships)
- Not building real auth integration into the landing page CTAs (they link to `/auth/register` or a demo booking flow)

## Design System (landing-page scoped)

Independent of MUI theme. Each variant defines:

- `--lp-bg` — page background
- `--lp-text` — primary text
- `--lp-text-muted` — secondary text
- `--lp-accent` — primary brand color
- `--lp-accent-soft` — subtle brand background
- `--lp-surface` — card/section backgrounds
- `--lp-border` — borders and dividers
- `--lp-hero-bg` — hero section background
- `--lp-font-display` — heading font stack
- `--lp-font-body` — body font stack

Typography is sourced from Google Fonts (loaded via CSS `@import` in the landing page stylesheet, not via MUI).