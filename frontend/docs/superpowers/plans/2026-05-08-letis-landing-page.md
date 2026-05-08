# Letis POS Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic admin-template landing page with a world-class Letis POS landing page featuring three switchable visual themes.

**Architecture:** A single React page component composes 11 self-contained sections. A theme context/provider sets CSS custom properties on `:root` scoped to `data-lp-theme`. Each section reads tokens via CSS variables — no prop drilling. Three theme token files define the visual variants. Sections use MUI layout primitives (Box, Container, Grid, Typography) with custom styling via CSS variables and framer-motion for scroll-triggered reveals.

**Tech Stack:** React 19 + TypeScript, MUI 7, framer-motion, CSS custom properties, Google Fonts

---

## File Map

```
Create: frontend/src/views/pages/landingpage/
  Landingpage.tsx               — page composition, theme provider wrapper
  LandingpageTheme.tsx           — theme context, provider, CSS variable application
  Landingpage.css                — base styles, font imports, CSS variable defaults
  themes/
    types.ts                     — ThemeTokens interface
    refined-enterprise.ts        — token values
    bold-energetic.ts            — token values
    brutalist-honest.ts          — token values
  sections/
    Header.tsx                   — sticky nav with logo + links + CTAs
    Hero.tsx                     — headline, subtext, dual CTA, visual
    TrustBar.tsx                 — capability badges
    ModulesGrid.tsx              — 8 operational system cards
    HowItWorks.tsx               — 3-step timeline
    AiHighlight.tsx              — AI capabilities deep-dive
    Testimonials.tsx             — testimonial carousel
    Pricing.tsx                  — 3-tier pricing
    Faq.tsx                      — accordion FAQ
    FinalCta.tsx                 — closing CTA banner
    Footer.tsx                   — site footer
  components/
    ThemeToggle.tsx              — theme switcher UI
    CtaButton.tsx                — dual-variant CTA button
    SectionWrapper.tsx           — scroll-triggered fade-up container

Modify: frontend/src/routes/Router.tsx — route / → Landingpage, keep /landingpage alias
```

---

### Task 1: Theme System Foundation

**Files:**
- Create: `frontend/src/views/pages/landingpage/themes/types.ts`
- Create: `frontend/src/views/pages/landingpage/themes/refined-enterprise.ts`
- Create: `frontend/src/views/pages/landingpage/themes/bold-energetic.ts`
- Create: `frontend/src/views/pages/landingpage/themes/brutalist-honest.ts`
- Create: `frontend/src/views/pages/landingpage/LandingpageTheme.tsx`
- Create: `frontend/src/views/pages/landingpage/Landingpage.css`

- [ ] **Step 1: Write theme types**

```typescript
// frontend/src/views/pages/landingpage/themes/types.ts

export interface ThemeTokens {
  name: string;
  bg: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentHover: string;
  surface: string;
  surfaceHover: string;
  border: string;
  heroBg: string;
  heroText: string;
  ctaBg: string;
  ctaText: string;
  ctaSecondaryBg: string;
  ctaSecondaryText: string;
  ctaSecondaryBorder: string;
  fontDisplay: string;
  fontBody: string;
  googleFontsUrl: string;
}
```

- [ ] **Step 2: Write Refined Enterprise theme tokens**

```typescript
// frontend/src/views/pages/landingpage/themes/refined-enterprise.ts

import { ThemeTokens } from './types';

export const refinedEnterprise: ThemeTokens = {
  name: 'Refined Enterprise',
  bg: '#0F172A',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#4ADE80',
  accentSoft: 'rgba(74, 222, 128, 0.10)',
  accentHover: '#22C55E',
  surface: '#111827',
  surfaceHover: '#1E293B',
  border: 'rgba(226, 232, 240, 0.10)',
  heroBg: '#0F172A',
  heroText: '#F8FAFC',
  ctaBg: '#16A34A',
  ctaText: '#FFFFFF',
  ctaSecondaryBg: 'transparent',
  ctaSecondaryText: '#E2E8F0',
  ctaSecondaryBorder: '#334155',
  fontDisplay: "'Georgia', 'Times New Roman', serif",
  fontBody: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  googleFontsUrl: '',
};
```

- [ ] **Step 3: Write Bold & Energetic theme tokens**

```typescript
// frontend/src/views/pages/landingpage/themes/bold-energetic.ts

import { ThemeTokens } from './types';

export const boldEnergetic: ThemeTokens = {
  name: 'Bold & Energetic',
  bg: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  accent: '#16A34A',
  accentSoft: '#ECFDF5',
  accentHover: '#15803D',
  surface: '#F8FAFC',
  surfaceHover: '#F1F5F9',
  border: '#E2E8F0',
  heroBg: '#ECFDF5',
  heroText: '#0F172A',
  ctaBg: '#16A34A',
  ctaText: '#FFFFFF',
  ctaSecondaryBg: '#DCFCE7',
  ctaSecondaryText: '#15803D',
  ctaSecondaryBorder: '#BBF7D0',
  fontDisplay: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontBody: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  googleFontsUrl: '',
};
```

- [ ] **Step 4: Write Brutalist Honest theme tokens**

```typescript
// frontend/src/views/pages/landingpage/themes/brutalist-honest.ts

import { ThemeTokens } from './types';

export const brutalistHonest: ThemeTokens = {
  name: 'Brutalist Honest',
  bg: '#FFFBEB',
  text: '#0F172A',
  textMuted: '#334155',
  accent: '#16A34A',
  accentSoft: 'rgba(22, 163, 74, 0.08)',
  accentHover: '#15803D',
  surface: '#FFFFFF',
  surfaceHover: '#FEF3C7',
  border: '#0F172A',
  heroBg: '#FFFBEB',
  heroText: '#0F172A',
  ctaBg: '#0F172A',
  ctaText: '#4ADE80',
  ctaSecondaryBg: '#FFFFFF',
  ctaSecondaryText: '#0F172A',
  ctaSecondaryBorder: '#0F172A',
  fontDisplay: "'Courier New', 'IBM Plex Mono', monospace",
  fontBody: "'Courier New', 'IBM Plex Mono', monospace",
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap',
};
```

- [ ] **Step 5: Write theme context and provider**

```typescript
// frontend/src/views/pages/landingpage/LandingpageTheme.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeTokens } from './themes/types';
import { refinedEnterprise } from './themes/refined-enterprise';
import { boldEnergetic } from './themes/bold-energetic';
import { brutalistHonest } from './themes/brutalist-honest';

const themes: Record<string, ThemeTokens> = {
  'refined-enterprise': refinedEnterprise,
  'bold-energetic': boldEnergetic,
  'brutalist-honest': brutalistHonest,
};

const STORAGE_KEY = 'letis-lp-theme';
const DEFAULT_THEME = 'refined-enterprise';

interface ThemeContextValue {
  theme: string;
  setTheme: (key: string) => void;
  tokens: ThemeTokens;
  themeKeys: string[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useLpTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useLpTheme must be used within LpThemeProvider');
  return ctx;
}

function applyTokens(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--lp-bg', tokens.bg);
  root.style.setProperty('--lp-text', tokens.text);
  root.style.setProperty('--lp-text-muted', tokens.textMuted);
  root.style.setProperty('--lp-accent', tokens.accent);
  root.style.setProperty('--lp-accent-soft', tokens.accentSoft);
  root.style.setProperty('--lp-accent-hover', tokens.accentHover);
  root.style.setProperty('--lp-surface', tokens.surface);
  root.style.setProperty('--lp-surface-hover', tokens.surfaceHover);
  root.style.setProperty('--lp-border', tokens.border);
  root.style.setProperty('--lp-hero-bg', tokens.heroBg);
  root.style.setProperty('--lp-hero-text', tokens.heroText);
  root.style.setProperty('--lp-cta-bg', tokens.ctaBg);
  root.style.setProperty('--lp-cta-text', tokens.ctaText);
  root.style.setProperty('--lp-cta-secondary-bg', tokens.ctaSecondaryBg);
  root.style.setProperty('--lp-cta-secondary-text', tokens.ctaSecondaryText);
  root.style.setProperty('--lp-cta-secondary-border', tokens.ctaSecondaryBorder);
  root.style.setProperty('--lp-font-display', tokens.fontDisplay);
  root.style.setProperty('--lp-font-body', tokens.fontBody);
}

export function LpThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && themes[stored] ? stored : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const tokens = themes[theme];

  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  const setTheme = useCallback((key: string) => {
    if (themes[key]) {
      setThemeState(key);
      try {
        localStorage.setItem(STORAGE_KEY, key);
      } catch {
        // localStorage unavailable — silently ignore
      }
    }
  }, []);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    tokens,
    themeKeys: Object.keys(themes),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

- [ ] **Step 6: Write base CSS with font imports and defaults**

```css
/* frontend/src/views/pages/landingpage/Landingpage.css */

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

/* CSS variable defaults (overridden by theme provider) */
:root {
  --lp-bg: #0F172A;
  --lp-text: #F8FAFC;
  --lp-text-muted: #94A3B8;
  --lp-accent: #4ADE80;
  --lp-accent-soft: rgba(74, 222, 128, 0.10);
  --lp-accent-hover: #22C55E;
  --lp-surface: #111827;
  --lp-surface-hover: #1E293B;
  --lp-border: rgba(226, 232, 240, 0.10);
  --lp-hero-bg: #0F172A;
  --lp-hero-text: #F8FAFC;
  --lp-cta-bg: #16A34A;
  --lp-cta-text: #FFFFFF;
  --lp-cta-secondary-bg: transparent;
  --lp-cta-secondary-text: #E2E8F0;
  --lp-cta-secondary-border: #334155;
  --lp-font-display: 'Georgia', 'Times New Roman', serif;
  --lp-font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Smooth scroll for the whole page */
html {
  scroll-behavior: smooth;
}

/* Base landing page styles */
.lp-page {
  background: var(--lp-bg);
  color: var(--lp-text);
  font-family: var(--lp-font-body);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.lp-page * {
  box-sizing: border-box;
}
```

- [ ] **Step 7: Verify theme foundation compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`
Expected: No errors from the landingpage directory.

---

### Task 2: Router — Route Landing Page at `/`

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add Landingpage import and update routes**

Read the file first to get exact current content. Add the Landingpage lazy import near the other page imports (around line 343), then change the root route.

Add import (after existing landingpage import on line 343):
```typescript
// Replace the old Landingpage import with the new one
const Landingpage = Loadable(lazy(() => import('../views/pages/landingpage/Landingpage')));
```

Change the root route in the BlankLayout section (around line 603):
```typescript
// Keep the existing /landingpage route
{ path: '/landingpage', element: <Landingpage /> },
```

Add a new root route that shows the landing page at `/`:
In the first route group (path: '/', element: `<FullLayout />`), change:
```typescript
{ path: '/', element: <Navigate to="/smartpos/dashboard" /> },
```
to:
```typescript
// Root is handled by the BlankLayout route below
```

And add at the top of the BlankLayout children array:
```typescript
{ path: '/', element: <Landingpage /> },
```

- [ ] **Step 2: Verify routes compile**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`
Expected: No errors.

---

### Task 3: Shared Components — CtaButton, SectionWrapper, ThemeToggle

**Files:**
- Create: `frontend/src/views/pages/landingpage/components/CtaButton.tsx`
- Create: `frontend/src/views/pages/landingpage/components/SectionWrapper.tsx`
- Create: `frontend/src/views/pages/landingpage/components/ThemeToggle.tsx`

- [ ] **Step 1: Write CtaButton**

```typescript
// frontend/src/views/pages/landingpage/components/CtaButton.tsx

import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface CtaButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary';
  href?: string;
}

const CtaButton: React.FC<CtaButtonProps> = ({
  variant = 'primary',
  href,
  children,
  sx,
  ...rest
}) => {
  const isPrimary = variant === 'primary';

  const baseSx = {
    px: 4,
    py: 1.5,
    fontFamily: 'var(--lp-font-body)',
    fontSize: '0.938rem',
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: isPrimary ? '8px' : '8px',
    transition: 'all 0.2s ease',
    ...(isPrimary
      ? {
          bgcolor: 'var(--lp-cta-bg)',
          color: 'var(--lp-cta-text)',
          '&:hover': {
            bgcolor: 'var(--lp-accent-hover)',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
          },
        }
      : {
          bgcolor: 'var(--lp-cta-secondary-bg)',
          color: 'var(--lp-cta-secondary-text)',
          border: '1px solid var(--lp-cta-secondary-border)',
          '&:hover': {
            bgcolor: 'var(--lp-accent-soft)',
            transform: 'translateY(-1px)',
          },
        }),
    ...sx,
  };

  const button = (
    <Button variant="text" sx={baseSx} {...rest}>
      {children}
    </Button>
  );

  if (href) {
    return (
      <Button variant="text" href={href} sx={baseSx} {...rest}>
        {children}
      </Button>
    );
  }

  return button;
};

export default CtaButton;
```

- [ ] **Step 2: Write SectionWrapper (scroll-triggered fade-up)**

```typescript
// frontend/src/views/pages/landingpage/components/SectionWrapper.tsx

import React, { useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useInView } from 'framer-motion';

interface SectionWrapperProps extends BoxProps {
  children: React.ReactNode;
  /** Section id for anchor links */
  id?: string;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  id,
  sx,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <Box
      ref={ref}
      id={id}
      component={motion.div}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      sx={{ py: { xs: 8, md: 12 }, ...sx }}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default SectionWrapper;
```

- [ ] **Step 3: Write ThemeToggle**

```typescript
// frontend/src/views/pages/landingpage/components/ThemeToggle.tsx

import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { IconPaint } from '@tabler/icons-react';
import { useLpTheme } from '../LandingpageTheme';

const themeLabels: Record<string, string> = {
  'refined-enterprise': 'Refined Enterprise',
  'bold-energetic': 'Bold & Energetic',
  'brutalist-honest': 'Brutalist Honest',
};

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, themeKeys } = useLpTheme();
  const [open, setOpen] = React.useState(false);

  const cycleTheme = () => {
    const idx = themeKeys.indexOf(theme);
    const next = themeKeys[(idx + 1) % themeKeys.length];
    setTheme(next);
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      <Tooltip title={`Theme: ${themeLabels[theme] || theme}`} placement="left">
        <IconButton
          onClick={cycleTheme}
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'var(--lp-surface)',
            color: 'var(--lp-text)',
            border: '1px solid var(--lp-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            '&:hover': {
              bgcolor: 'var(--lp-surface-hover)',
            },
          }}
        >
          <IconPaint size={20} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ThemeToggle;
```

- [ ] **Step 4: Verify shared components compile**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`
Expected: No errors.

---

### Task 4: Header Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/Header.tsx`

- [ ] **Step 1: Write Header component**

```typescript
// frontend/src/views/pages/landingpage/sections/Header.tsx

import React from 'react';
import { AppBar, Toolbar, Container, Box, Stack, useMediaQuery, IconButton, Theme } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import CtaButton from '../components/CtaButton';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
];

const Header: React.FC = () => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: scrolled ? 'var(--lp-surface)' : 'var(--lp-bg)',
        borderBottom: scrolled ? '1px solid var(--lp-border)' : '1px solid transparent',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 80 }, justifyContent: 'space-between' }}>
          {/* Logo */}
          <Box
            component="a"
            href="/"
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--lp-text)',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            Letis
          </Box>

          {/* Desktop nav */}
          {!isMobile && (
            <Stack direction="row" spacing={4} alignItems="center">
              {navLinks.map((link) => (
                <Box
                  key={link.href}
                  component="a"
                  href={link.href}
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.938rem',
                    color: 'var(--lp-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                    '&:hover': { color: 'var(--lp-text)' },
                  }}
                >
                  {link.label}
                </Box>
              ))}
              <Stack direction="row" spacing={1.5}>
                <CtaButton variant="secondary" href="/auth/login">
                  Sign in
                </CtaButton>
                <CtaButton variant="primary" href="/auth/register">
                  Start free trial
                </CtaButton>
              </Stack>
            </Stack>
          )}

          {/* Mobile menu button */}
          {isMobile && (
            <IconButton sx={{ color: 'var(--lp-text)' }}>
              <IconMenu2 size={22} />
            </IconButton>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
```

- [ ] **Step 2: Verify Header compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 5: Hero Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/Hero.tsx`

- [ ] **Step 1: Write Hero component**

```typescript
// frontend/src/views/pages/landingpage/sections/Hero.tsx

import React from 'react';
import { Box, Container, Typography, Stack, Grid } from '@mui/material';
import CtaButton from '../components/CtaButton';

const Hero: React.FC = () => {
  return (
    <Box
      sx={{
        bgcolor: 'var(--lp-hero-bg)',
        color: 'var(--lp-hero-text)',
        minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' },
        display: 'flex',
        alignItems: 'center',
        pt: { xs: 8, md: 0 },
        pb: { xs: 8, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              variant="h1"
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                mb: 3,
              }}
            >
              Run your entire business from one place
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: { xs: '1.125rem', md: '1.25rem' },
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                maxWidth: 560,
                mb: 5,
              }}
            >
              POS, inventory, accounting, and AI insights — unified without compromise.
              Letis gives you every tool you need to run a modern retail operation.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <CtaButton variant="primary" href="/auth/register" size="large">
                Start free trial
              </CtaButton>
              <CtaButton variant="secondary" size="large">
                Book a demo
              </CtaButton>
            </Stack>

            {/* Capability badges — inline */}
            <Stack direction="row" spacing={1.5} mt={5} flexWrap="wrap" useFlexGap>
              {['POS Terminal', 'Inventory', 'Accounting', 'AI Reports', 'HRM', 'Multi-store'].map((badge) => (
                <Box
                  key={badge}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: '50px',
                    border: '1px solid var(--lp-border)',
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.813rem',
                    color: 'var(--lp-text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge}
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            {/* Dashboard visual placeholder — will be replaced with real Letis screenshots */}
            <Box
              sx={{
                aspectRatio: '4/3',
                bgcolor: 'var(--lp-surface)',
                borderRadius: 3,
                border: '1px solid var(--lp-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--lp-text-muted)',
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.875rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <Box sx={{ textAlign: 'center', px: 4 }}>
                <Typography sx={{ fontFamily: 'var(--lp-font-display)', fontSize: '1rem', mb: 1, color: 'var(--lp-accent)' }}>
                  Letis Dashboard
                </Typography>
                <Typography sx={{ fontSize: '0.813rem', color: 'var(--lp-text-muted)' }}>
                  Real-time sales, inventory levels, and business insights — all in one view.
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Hero;
```

- [ ] **Step 2: Verify Hero compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 6: TrustBar Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/TrustBar.tsx`

- [ ] **Step 1: Write TrustBar component**

```typescript
// frontend/src/views/pages/landingpage/sections/TrustBar.tsx

import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import SectionWrapper from '../components/SectionWrapper';

const capabilities = [
  { label: 'POS Terminal', value: 'In-store & online' },
  { label: 'Inventory', value: 'Multi-warehouse' },
  { label: 'Accounting', value: 'Double-entry' },
  { label: 'AI Reports', value: 'Predictive insights' },
  { label: 'HRM', value: 'Staff & payroll' },
  { label: 'Multi-store', value: 'Unlimited locations' },
];

const TrustBar: React.FC = () => {
  return (
    <SectionWrapper sx={{ py: 5, borderBottom: '1px solid var(--lp-border)' }}>
      <Container maxWidth="lg">
        <Typography
          sx={{
            fontFamily: 'var(--lp-font-body)',
            fontSize: '0.813rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--lp-text-muted)',
            mb: 3,
          }}
        >
          Everything you need to run a modern retail business
        </Typography>
        <Stack
          direction="row"
          spacing={0}
          flexWrap="wrap"
          useFlexGap
          sx={{ gap: 1.5 }}
        >
          {capabilities.map((cap) => (
            <Box
              key={cap.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: '8px',
                bgcolor: 'var(--lp-surface)',
                border: '1px solid var(--lp-border)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--lp-text)',
                }}
              >
                {cap.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--lp-text-muted)',
                }}
              >
                {cap.value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </SectionWrapper>
  );
};

export default TrustBar;
```

- [ ] **Step 2: Verify TrustBar compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 7: ModulesGrid Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/ModulesGrid.tsx`

- [ ] **Step 1: Write ModulesGrid component**

```typescript
// frontend/src/views/pages/landingpage/sections/ModulesGrid.tsx

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import {
  IconCashRegister,
  IconPackages,
  IconCalculator,
  IconTruck,
  IconReportAnalytics,
  IconBrain,
  IconUsers,
  IconBuildingStore,
} from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const modules = [
  {
    icon: <IconCashRegister size={28} strokeWidth={1.5} />,
    title: 'Point of Sale',
    description: 'Fast checkout, barcode scanning, customer display, and receipt printing — online or offline.',
    color: '#4ADE80',
  },
  {
    icon: <IconPackages size={28} strokeWidth={1.5} />,
    title: 'Inventory Management',
    description: 'Track stock across every warehouse, serial number, and shelf in real time.',
    color: '#3B82F6',
  },
  {
    icon: <IconCalculator size={28} strokeWidth={1.5} />,
    title: 'Accounting',
    description: 'Double-entry ledger, chart of accounts, journal entries, and financial statements.',
    color: '#8B5CF6',
  },
  {
    icon: <IconTruck size={28} strokeWidth={1.5} />,
    title: 'Purchases & Suppliers',
    description: 'Purchase orders, supplier management, and procurement workflow from order to payment.',
    color: '#F59E0B',
  },
  {
    icon: <IconReportAnalytics size={28} strokeWidth={1.5} />,
    title: 'Reports & Analytics',
    description: 'Sales, inventory, tax, customer, and payment reports — filterable and exportable.',
    color: '#EF4444',
  },
  {
    icon: <IconBrain size={28} strokeWidth={1.5} />,
    title: 'AI Insights',
    description: 'Smart predictions, reorder alerts, trend detection, and automated report summaries.',
    color: '#06B6D4',
  },
  {
    icon: <IconUsers size={28} strokeWidth={1.5} />,
    title: 'HRM & Payroll',
    description: 'Employee records, attendance tracking, leave management, and payroll processing.',
    color: '#EC4899',
  },
  {
    icon: <IconBuildingStore size={28} strokeWidth={1.5} />,
    title: 'Multi-store Management',
    description: 'Centralized control across unlimited locations with consolidated reporting.',
    color: '#14B8A6',
  },
];

const ModulesGrid: React.FC = () => {
  return (
    <SectionWrapper id="features">
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
            Everything included
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-body)',
              fontSize: '1.125rem',
              color: 'var(--lp-text-muted)',
              maxWidth: 560,
              mx: 'auto',
            }}
          >
            No modules to buy. No feature gates. Every tool is available from day one.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {modules.map((mod, idx) => (
            <Grid key={mod.title} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'var(--lp-surface)',
                  border: '1px solid var(--lp-border)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'var(--lp-surface-hover)',
                    transform: 'translateY(-2px)',
                    borderColor: mod.color,
                  },
                }}
              >
                <Box sx={{ color: mod.color, mb: 2 }}>{mod.icon}</Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-display)',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  {mod.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--lp-text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {mod.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default ModulesGrid;
```

- [ ] **Step 2: Verify ModulesGrid compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 8: HowItWorks Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/HowItWorks.tsx`

- [ ] **Step 1: Write HowItWorks component**

```typescript
// frontend/src/views/pages/landingpage/sections/HowItWorks.tsx

import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import { IconUserPlus, IconPackages, IconCash } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const steps = [
  {
    step: '01',
    icon: <IconUserPlus size={32} strokeWidth={1.5} />,
    title: 'Create your account',
    description: 'Sign up in 30 seconds. Choose your plan. No credit card needed to start.',
  },
  {
    step: '02',
    icon: <IconPackages size={32} strokeWidth={1.5} />,
    title: 'Add your products',
    description: 'Import your inventory, set prices, configure taxes. Bulk import supported.',
  },
  {
    step: '03',
    icon: <IconCash size={32} strokeWidth={1.5} />,
    title: 'Start selling',
    description: 'Open the POS terminal and start processing sales. Your inventory and accounts update automatically.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <SectionWrapper>
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
            Get running in minutes
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
            From sign-up to first sale — no training required.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="flex-start"
        >
          {steps.map((s) => (
            <Box key={s.step} sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '3rem',
                  fontWeight: 700,
                  color: 'var(--lp-accent-soft)',
                  lineHeight: 1,
                  mb: 2,
                  WebkitTextStroke: '1px var(--lp-accent)',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {s.step}
              </Typography>
              <Box sx={{ color: 'var(--lp-accent)', mb: 2 }}>{s.icon}</Box>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {s.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.938rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {s.description}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </SectionWrapper>
  );
};

export default HowItWorks;
```

- [ ] **Step 2: Verify HowItWorks compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 9: AiHighlight Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/AiHighlight.tsx`

- [ ] **Step 1: Write AiHighlight component**

```typescript
// frontend/src/views/pages/landingpage/sections/AiHighlight.tsx

import React from 'react';
import { Box, Container, Typography, Grid, Stack } from '@mui/material';
import { IconTrendingUp, IconAlertTriangle, IconFileReport } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const capabilities = [
  {
    icon: <IconTrendingUp size={24} strokeWidth={1.5} />,
    title: 'Sales forecasting',
    description: 'Predict next week\'s revenue based on historical patterns, seasonality, and current trends.',
  },
  {
    icon: <IconAlertTriangle size={24} strokeWidth={1.5} />,
    title: 'Smart reorder alerts',
    description: 'Get notified when stock hits critical levels — before you run out. AI learns your lead times.',
  },
  {
    icon: <IconFileReport size={24} strokeWidth={1.5} />,
    title: 'Automated reports',
    description: 'Daily, weekly, or monthly summaries generated and delivered automatically. No manual work.',
  },
];

const AiHighlight: React.FC = () => {
  return (
    <SectionWrapper>
      <Container maxWidth="lg">
        <Grid container spacing={8} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: { xs: '2rem', md: '2.75rem' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                mb: 2,
              }}
            >
              AI that works for you
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '1.125rem',
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Letis AI analyzes your sales and inventory data to surface what matters — predictions, alerts, and insights — so you can focus on running your business.
            </Typography>
            <Stack spacing={3}>
              {capabilities.map((cap) => (
                <Box key={cap.title} sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ color: 'var(--lp-accent)', flexShrink: 0, mt: 0.5 }}>
                    {cap.icon}
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: 'var(--lp-font-display)',
                        fontSize: '1.063rem',
                        fontWeight: 600,
                        mb: 0.5,
                      }}
                    >
                      {cap.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'var(--lp-font-body)',
                        fontSize: '0.938rem',
                        color: 'var(--lp-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {cap.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                aspectRatio: '16/10',
                bgcolor: 'var(--lp-surface)',
                borderRadius: 3,
                border: '1px solid var(--lp-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--lp-text-muted)',
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.875rem',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ textAlign: 'center', px: 4 }}>
                <Typography sx={{ fontFamily: 'var(--lp-font-display)', fontSize: '1rem', mb: 1, color: 'var(--lp-accent)' }}>
                  AI Insights Dashboard
                </Typography>
                <Typography sx={{ fontSize: '0.813rem', color: 'var(--lp-text-muted)' }}>
                  Smart predictions and automated reports — generated from your data.
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default AiHighlight;
```

- [ ] **Step 2: Verify AiHighlight compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 10: Testimonials Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/Testimonials.tsx`

- [ ] **Step 1: Write Testimonials component**

```typescript
// frontend/src/views/pages/landingpage/sections/Testimonials.tsx

import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import { IconQuote } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const testimonials = [
  {
    quote: 'Letis replaced three separate systems. Our inventory accuracy went from "best guess" to 99%. The time savings alone paid for the switch in the first month.',
    name: 'Sarah Mensah',
    role: 'Owner, QuickMart — 3 locations',
  },
  {
    quote: 'The accounting integration is what sold us. Sales flow directly into our ledger. Month-end close used to take 3 days — now it takes an afternoon.',
    name: 'David Ochieng',
    role: 'Finance Manager, RetailPlus Ltd',
  },
  {
    quote: 'We run 12 stores across two cities. Letis gives me a single dashboard for everything — stock levels, daily sales, staff attendance. I check it every morning.',
    name: 'Amina Diallo',
    role: 'Operations Director, CityGoods Group',
  },
];

const Testimonials: React.FC = () => {
  return (
    <SectionWrapper>
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
            Trusted by businesses like yours
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {testimonials.map((t) => (
            <Grid key={t.name} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'var(--lp-surface)',
                  border: '1px solid var(--lp-border)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ color: 'var(--lp-accent)', mb: 2 }}>
                  <IconQuote size={32} strokeWidth={1.5} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.938rem',
                    color: 'var(--lp-text)',
                    lineHeight: 1.7,
                    mb: 3,
                    flex: 1,
                  }}
                >
                  "{t.quote}"
                </Typography>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-display)',
                      fontSize: '0.938rem',
                      fontWeight: 600,
                    }}
                  >
                    {t.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.813rem',
                      color: 'var(--lp-text-muted)',
                    }}
                  >
                    {t.role}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default Testimonials;
```

- [ ] **Step 2: Verify Testimonials compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 11: Pricing Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/Pricing.tsx`

- [ ] **Step 1: Write Pricing component**

```typescript
// frontend/src/views/pages/landingpage/sections/Pricing.tsx

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
```

- [ ] **Step 2: Verify Pricing compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 12: FAQ Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/Faq.tsx`

- [ ] **Step 1: Write Faq component**

```typescript
// frontend/src/views/pages/landingpage/sections/Faq.tsx

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const faqs = [
  {
    question: 'Does Letis work offline?',
    answer: 'Yes. The POS terminal works fully offline. Sales are processed locally and synced automatically when you reconnect. Your internet going down does not stop your business.',
  },
  {
    question: 'What hardware do I need?',
    answer: 'Letis runs on any modern web browser — desktop, laptop, or tablet. For the POS terminal, we recommend a touchscreen device with a barcode scanner and receipt printer. Most standard POS hardware is compatible.',
  },
  {
    question: 'Can I migrate data from my current system?',
    answer: 'Yes. We support bulk import for products, customers, suppliers, and opening stock via CSV or Excel. Our support team can help with complex migrations from legacy systems.',
  },
  {
    question: 'How does multi-store work?',
    answer: 'Each store operates independently with its own inventory and POS terminal. A centralized dashboard gives you consolidated reporting, cross-location inventory visibility, and inter-store transfers. Permissions are role-based per store.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support with a 24-hour response time. Professional plans get priority support (4-hour response). Enterprise customers get a dedicated account manager and 24/7 phone support.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We run automated backups every hour. You can export your data at any time in standard formats — your data is yours.',
  },
];

const Faq: React.FC = () => {
  return (
    <SectionWrapper>
      <Container maxWidth="md">
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
            Frequently asked questions
          </Typography>
        </Box>

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
              expandIcon={<IconChevronDown size={18} style={{ color: 'var(--lp-text-muted)' }} />}
              sx={{
                py: 1,
                '& .MuiAccordionSummary-content': { my: 2 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.063rem',
                  fontWeight: 600,
                }}
              >
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.938rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.7,
                  pb: 2,
                }}
              >
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </SectionWrapper>
  );
};

export default Faq;
```

- [ ] **Step 2: Verify Faq compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 13: FinalCta Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/FinalCta.tsx`

- [ ] **Step 1: Write FinalCta component**

```typescript
// frontend/src/views/pages/landingpage/sections/FinalCta.tsx

import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import CtaButton from '../components/CtaButton';
import SectionWrapper from '../components/SectionWrapper';

const FinalCta: React.FC = () => {
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
            <CtaButton variant="secondary" size="large">
              Book a demo
            </CtaButton>
          </Stack>
        </Box>
      </Container>
    </SectionWrapper>
  );
};

export default FinalCta;
```

- [ ] **Step 2: Verify FinalCta compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 14: Footer Section

**Files:**
- Create: `frontend/src/views/pages/landingpage/sections/Footer.tsx`

- [ ] **Step 1: Write Footer component**

```typescript
// frontend/src/views/pages/landingpage/sections/Footer.tsx

import React from 'react';
import { Box, Container, Typography, Grid, Stack } from '@mui/material';

const footerLinks = {
  Product: ['Point of Sale', 'Inventory', 'Accounting', 'Reports', 'AI Insights', 'Integrations'],
  Company: ['About', 'Careers', 'Blog', 'Press'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Security'],
};

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid var(--lp-border)',
        py: { xs: 8, md: 10 },
        bgcolor: 'var(--lp-surface)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Letis
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.875rem',
                color: 'var(--lp-text-muted)',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              The all-in-one POS platform for modern retail. Run your entire business from one place.
            </Typography>
          </Grid>

          {Object.entries(footerLinks).map(([category, links]) => (
            <Grid key={category} size={{ xs: 6, md: 2.6 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--lp-text-muted)',
                  mb: 2,
                }}
              >
                {category}
              </Typography>
              <Stack spacing={1.5}>
                {links.map((link) => (
                  <Typography
                    key={link}
                    component="a"
                    href="#"
                    sx={{
                      fontFamily: 'var(--lp-font-body)',
                      fontSize: '0.875rem',
                      color: 'var(--lp-text)',
                      textDecoration: 'none',
                      '&:hover': { color: 'var(--lp-accent)' },
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {link}
                  </Typography>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Box
          sx={{
            mt: 8,
            pt: 4,
            borderTop: '1px solid var(--lp-border)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-body)',
              fontSize: '0.813rem',
              color: 'var(--lp-text-muted)',
            }}
          >
            &copy; {new Date().getFullYear()} Letis. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
```

- [ ] **Step 2: Verify Footer compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -40`

---

### Task 15: Landing Page Composition

**Files:**
- Create: `frontend/src/views/pages/landingpage/Landingpage.tsx`

- [ ] **Step 1: Write the main Landingpage component**

```typescript
// frontend/src/views/pages/landingpage/Landingpage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { LpThemeProvider } from './LandingpageTheme';
import ThemeToggle from './components/ThemeToggle';
import Header from './sections/Header';
import Hero from './sections/Hero';
import TrustBar from './sections/TrustBar';
import ModulesGrid from './sections/ModulesGrid';
import HowItWorks from './sections/HowItWorks';
import AiHighlight from './sections/AiHighlight';
import Testimonials from './sections/Testimonials';
import Pricing from './sections/Pricing';
import Faq from './sections/Faq';
import FinalCta from './sections/FinalCta';
import Footer from './sections/Footer';
import './Landingpage.css';

const Landingpage: React.FC = () => {
  return (
    <LpThemeProvider>
      <Box className="lp-page">
        <Header />
        <main>
          <Hero />
          <TrustBar />
          <ModulesGrid />
          <HowItWorks />
          <AiHighlight />
          <Testimonials />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
        <ThemeToggle />
      </Box>
    </LpThemeProvider>
  );
};

export default Landingpage;
```

- [ ] **Step 2: Verify the full page compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -50`
Expected: No errors.

---

### Task 16: Router Integration & Final Verification

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Update Router to show landing page at `/`**

In `frontend/src/routes/Router.tsx`, the root path `/` currently redirects to `/smartpos/dashboard`. Change it to show the landing page:

Find the BlankLayout route group (the third route group in the array). Add a root-level route for the landing page:

```typescript
{
  path: '/',
  element: <BlankLayout />,
  children: [
    { path: '/', element: <Landingpage /> },           // ADD THIS — landing page at root
    { path: '/auth/404', element: <Error /> },
    // ... rest of existing routes
    { path: '/landingpage', element: <Landingpage /> }, // KEEP existing alias
    // ...
  ],
},
```

Also remove the redirect from the FullLayout root:
```typescript
// REMOVE this line from the FullLayout children:
// { path: '/', element: <Navigate to="/smartpos/dashboard" /> },
```

- [ ] **Step 2: Full TypeScript check**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Start dev server and verify page renders**

Run: `cd frontend && npx vite --host 0.0.0.0 &`
Open `http://localhost:5173` and verify:
- Landing page renders at `/`
- Header, hero, all sections visible
- Theme toggle in bottom-right corner works
- Three themes switch correctly
- Page is responsive (test mobile viewport)
- Scroll animations trigger on section entry
- Navigation links scroll to correct sections
- CTA buttons link to `/auth/register`

- [ ] **Step 4: Commit all landing page files**

```bash
git add frontend/src/views/pages/landingpage/ frontend/src/routes/Router.tsx
git commit -m "feat: add Letis POS landing page with three switchable visual themes

Replace generic admin-template placeholder with a world-class landing page
featuring Refined Enterprise (default), Bold & Energetic, and Brutalist Honest
themes. 11 sections from hero to footer with scroll-triggered animations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
