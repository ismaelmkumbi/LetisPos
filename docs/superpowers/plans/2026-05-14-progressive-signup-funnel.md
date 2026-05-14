# Progressive Single-Funnel Signup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3-step registration wizard with a single-page signup, enhance welcome dashboard, and add context-driven in-app upgrade triggers — in Warm Brutalism aesthetic.

**Architecture:** All frontend-only changes. No backend API changes. New `warmBrutalism.ts` theme tokens file. Six files modified: `LetisAuthLayout.tsx`, `AuthRegister.tsx`, `AuthLoginForm.tsx`, `OnboardingBanner.tsx`, `DashboardPage.tsx`, `PlanGate.tsx`. One new component: `LimitGate.tsx`.

**Tech Stack:** React 18, TypeScript, MUI v6, react-router v7, @tabler/icons-react

---

### Task 1: Warm Brutalism theme tokens

**Files:**
- Create: `frontend/src/theme/smartpos/warmBrutalism.ts`

- [ ] **Step 1: Create the warm brutalism tokens file**

```typescript
/**
 * Warm Brutalism — auth page theme tokens.
 *
 * Distinct from the main brand palette (green). Used exclusively on
 * LetisAuthLayout, AuthRegister, AuthLoginForm, and the welcome dashboard.
 *
 * Palette: charcoal ink, warm paper, gold/clay accents, deep green.
 * Typography: Newsreader (serif headlines) + DM Sans (UI body).
 */

export const wb = {
  ink: '#1a1a16',
  inkLight: '#3d3d36',
  paper: '#fafaf7',
  paperMuted: '#f3f2ee',
  gold: '#c2843a',
  goldLight: '#f5e6d3',
  clay: '#c4724a',
  clayLight: '#faf0e9',
  green: '#1b5e2f',
  greenLight: '#e8f5e9',
  greenMid: '#2e7d3a',
  border: '#e6e4dd',
  borderStrong: '#d4d2ca',

  radius: {
    sm: '6px',
    md: '10px',
    lg: '18px',
    xl: '24px',
  },

  shadow: {
    card: '0 1px 2px rgba(26,26,22,0.04), 0 4px 16px rgba(26,26,22,0.06)',
    elevated: '0 1px 2px rgba(26,26,22,0.05), 0 8px 32px rgba(26,26,22,0.09)',
  },

  font: {
    display: '"Newsreader", Georgia, serif',
    body: '"DM Sans", -apple-system, sans-serif',
  },

  /** Dark column background with grain texture via CSS */
  darkBg: `
    radial-gradient(ellipse at 25% 30%, rgba(194,132,58,0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 70% 75%, rgba(27,94,47,0.08) 0%, transparent 50%),
    linear-gradient(165deg, #1a1a16 0%, #2a2820 40%, #1f221b 100%)
  `,

  /** Light page background */
  lightBg: `
    radial-gradient(ellipse at 15% 20%, rgba(196,114,74,0.04) 0%, transparent 60%),
    radial-gradient(ellipse at 85% 80%, rgba(27,94,47,0.03) 0%, transparent 60%)
  `,
} as const;
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd frontend && npx tsc --noEmit src/theme/smartpos/warmBrutalism.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/theme/smartpos/warmBrutalism.ts
git commit -m "feat: add Warm Brutalism theme tokens for auth pages"
```

---

### Task 2: LetisAuthLayout — Warm Brutalism left column

**Files:**
- Modify: `frontend/src/views/authentication/auth1/LetisAuthLayout.tsx`

- [ ] **Step 1: Update the LetisAuthLayout left column for register mode**

Replace the existing left-column content (lines 482-557, the `Box` containing the brand logo, status chip, headline, supporting text, benefits, and ProductShowcase) with the new Warm Brutalism treatment. The changes apply to the `mode === 'register'` path only — login mode keeps its existing ProductShowcase layout.

The left column `Box` (starting at line 452) changes:
- Background: use `wb.darkBg` instead of the radial/linear gradient
- Add a gold vertical accent line (new `Box` child, positioned absolutely)
- Replace the product mockup with three trust rows + plan chip

The right column (form container, line 560+) stays structurally the same — only the form content inside it changes (handled in Task 3).

In `LetisAuthLayout.tsx`, replace the entire left-column `Box` from line 452 to line 557 with:

```tsx
import { wb } from 'src/theme/smartpos/warmBrutalism';

// Inside the component, replace the left-column Box (lines 452–557) with:

<Box
  sx={{
    position: 'relative',
    overflow: 'hidden',
    px: { xs: 2.4, sm: 5, md: 7, lg: 6, xl: 9 },
    py: { xs: 2.5, sm: 4, lg: 3.5, xl: 4.5 },
    minHeight: { xs: 'auto', lg: '100dvh' },
    display: { xs: 'none', lg: 'flex' },
    alignItems: 'center',
    background: wb.darkBg,
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'url("data:image/svg+xml,%3Csvg viewBox=\\'0 0 256 256\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'noise\\' x=\\'0\\' y=\\'0\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.72\\' numOctaves=\\'3\\' stitchTiles=\\'stitch\\'/%3E%3C/filter%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' filter=\\'url(%23noise)\\' opacity=\\'0.03\\'/%3E%3C/svg%3E")',
      opacity: 0.4,
      pointerEvents: 'none',
    },
  }}
>
  {/* Gold vertical accent line */}
  <Box
    sx={{
      position: 'absolute',
      left: 0,
      top: '12%',
      bottom: '12%',
      width: 3,
      background: `linear-gradient(180deg, transparent 0%, ${wb.gold} 20%, ${wb.gold} 80%, transparent 100%)`,
      borderRadius: '0 2px 2px 0',
    }}
  />

  <Box sx={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 440 }}>
    {/* Brand mark — gold/clay gradient square */}
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: wb.radius.md,
        background: `linear-gradient(135deg, ${wb.gold} 0%, ${wb.clay} 100%)`,
        display: 'grid',
        placeItems: 'center',
        mb: 6,
        boxShadow: `0 0 0 8px rgba(194,132,58,0.12)`,
        position: 'relative',
        animation: anim(0),
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: -2,
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)',
        },
      }}
    >
      <BrandLogo size="sm" color="onDark" />
    </Box>

    {/* Headline */}
    <Typography
      component="h1"
      sx={{
        fontFamily: wb.font.display,
        fontSize: { xs: '2.1rem', sm: '3rem', lg: '3rem', xl: '3.2rem' },
        fontWeight: 500,
        lineHeight: 1.08,
        letterSpacing: '-0.02em',
        color: wb.paper,
        mb: 2,
        animation: anim(130),
      }}
    >
      {mode === 'register' ? (
        <>
          Run your store{' '}
          <Box component="em" sx={{ fontStyle: 'italic', color: wb.gold }}>
            with confidence.
          </Box>
        </>
      ) : (
        <>
          {headline}
          <Box component="span" sx={{ display: 'block', color: brand.primary[600] }}>
            {accent}
          </Box>
        </>
      )}
    </Typography>

    {/* Supporting text */}
    <Typography
      sx={{
        mb: 6,
        maxWidth: 380,
        fontSize: { xs: '0.95rem', sm: '1.04rem', lg: '0.94rem', xl: '0.95rem' },
        lineHeight: 1.6,
        color: 'rgba(250,250,247,0.65)',
        animation: anim(190),
      }}
    >
      {mode === 'register'
        ? 'Full-featured POS, inventory, and analytics. Built for Tanzanian businesses ready to grow.'
        : supportingText}
    </Typography>

    {/* Trust rows (register mode) or benefits (login mode) */}
    {mode === 'register' ? (
      <Stack spacing={2} sx={{ animation: anim(250) }}>
        {[
          { icon: '30', title: '30-day full access trial', desc: 'Every feature unlocked. No credit card. No commitment.' },
          { icon: '✦', title: 'Free local onboarding', desc: 'Our Dar es Salaam team helps you get set up in hours, not weeks.' },
          { icon: 'M', title: 'Pay with M-Pesa', desc: 'Monthly or annual billing in Tanzanian shillings via mobile money.' },
        ].map((row, i) => (
          <Stack key={row.title} direction="row" spacing={1.75} sx={{ animation: anim(250 + i * 70) }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: wb.radius.sm,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: wb.gold,
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {row.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(250,250,247,0.9)' }}>
                {row.title}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(250,250,247,0.5)', lineHeight: 1.4 }}>
                {row.desc}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    ) : (
      <Stack spacing={{ xs: 1.7, lg: 1.2, xl: 1.5 }} sx={{ mt: { xs: 2.5, sm: 3.5, lg: 2, xl: 2.6 }, maxWidth: 450 }}>
        {benefits.map((item, index) => (
          <BenefitRow key={item.title} {...item} delay={250 + index * 70} />
        ))}
        <ProductShowcase mode={mode} />
      </Stack>
    )}

    {/* Plan chip (register mode only) */}
    {mode === 'register' && (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          mt: 5,
          px: 2,
          py: 1.25,
          borderRadius: '99px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.75rem',
          color: 'rgba(250,250,247,0.6)',
          animation: anim(500),
        }}
      >
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: wb.gold }} />
        You&apos;ll start on <Box component="strong" sx={{ color: wb.gold, fontWeight: 600, mx: 0.5 }}>Starter</Box> — upgrade anytime
      </Box>
    )}
  </Box>
</Box>
```

- [ ] **Step 2: Remove unused import**

The `ProductShowcase` component and `benefits` array are still needed for login mode. The `fadeInUp`, `softFloat`, `anim` helpers and `modeMeta` stay. `IconCloudUpload`, `IconSparkles`, and other benefit icons remain imported since login mode still uses them.

No imports to remove; the register-mode changes are additive.

- [ ] **Step 3: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors related to LetisAuthLayout.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/authentication/auth1/LetisAuthLayout.tsx
git commit -m "feat: Warm Brutalism left column for register mode in LetisAuthLayout"
```

---

### Task 3: AuthRegister — single-page quick signup

**Files:**
- Modify: `frontend/src/views/authentication/authForms/AuthRegister.tsx`

- [ ] **Step 1: Rewrite AuthRegister as a single-page form**

Replace the entire file content. The new form has no step state, no plan fetching, no wizard. It collects: business name, workspace slug, first name, last name, email, password. Submits with `billingPlan: 'STARTER'`.

```tsx
/**
 * Letis POS — Quick signup form.
 *
 * Single-page signup. Defaults to STARTER trial.
 * Warm Brutalism aesthetic. ~30 second completion.
 */
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconBuilding,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';

import { register } from 'src/api/smartpos/auth';
import { seedDefaultUnits } from 'src/api/smartpos/products';
import { seedDefaultCOA } from 'src/api/smartpos/accounting';
import { wb } from 'src/theme/smartpos/warmBrutalism';

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: wb.radius.md,
    bgcolor: wb.paper,
    fontSize: '0.875rem',
    height: { xs: 44, sm: 46 },
    '& fieldset': { borderColor: wb.border },
    '&:hover fieldset': { borderColor: wb.borderStrong },
    '&.Mui-focused fieldset': {
      borderColor: wb.greenMid,
      borderWidth: 1.5,
    },
  },
  '& .MuiOutlinedInput-input': { py: 1.2 },
} as const;

const labelSx = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: wb.inkLight,
  mb: 0.75,
  opacity: 0.7,
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

const AuthRegister: React.FC<Props> = ({ title, subtitle, subtext }) => {
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTenantNameChange = (val: string) => {
    setTenantName(val);
    if (!tenantSlug || tenantSlug === slugify(tenantName)) {
      setTenantSlug(slugify(val));
    }
  };

  const passwordStrength = ((): 0 | 1 | 2 | 3 | 4 => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score as 0 | 1 | 2 | 3 | 4;
  })();

  const strengthColors = [wb.border, wb.clay, wb.clay, wb.gold, wb.greenMid];

  const isFormReady =
    tenantName.trim().length > 1 &&
    email.trim().length > 0 &&
    password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { userId } = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim() || undefined,
        billingPlan: 'STARTER',
        channel: 'EMAIL',
      });
      navigate('/auth/verify-sent', {
        state: {
          userId,
          channel: 'EMAIL' as const,
          contact: email.trim().toLowerCase(),
        },
      });
      seedDefaultUnits().catch(() => {});
      seedDefaultCOA().catch(() => {});
    } catch (err) {
      type AxiosLike = { response?: { status?: number; data?: { detail?: string; title?: string } } };
      const e = err as AxiosLike;
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail ?? e?.response?.data?.title;
      if (status === 409) setError(detail ?? 'An account with this email or workspace already exists');
      else setError(detail ?? 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {title}
      {subtext}

      {/* Trial badge */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          bgcolor: wb.greenLight,
          border: `1px solid rgba(46,125,58,0.15)`,
          color: wb.green,
          px: 1.5,
          py: 0.75,
          borderRadius: '99px',
          fontSize: '0.7rem',
          fontWeight: 600,
          mb: 3,
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: wb.greenMid,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(0.85)' },
            },
          }}
        />
        30-day free trial · No credit card
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: wb.radius.md }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* Business name */}
        <Box>
          <Typography component="label" htmlFor="tenantName" sx={labelSx}>
            Business name
          </Typography>
          <TextField
            id="tenantName"
            name="tenantName"
            placeholder="e.g. Mwanza General Stores"
            fullWidth
            required
            value={tenantName}
            autoComplete="organization"
            onChange={(e) => handleTenantNameChange(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
                  <IconBuilding size={17} stroke={1.6} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Workspace slug */}
        <Box>
          <Typography component="label" htmlFor="tenantSlug" sx={labelSx}>
            Workspace URL
          </Typography>
          <TextField
            id="tenantSlug"
            name="tenantSlug"
            placeholder="mwanza-stores"
            fullWidth
            value={tenantSlug}
            onChange={(e) => setTenantSlug(slugify(e.target.value))}
            sx={fieldSx}
          />
          <Typography sx={{ fontSize: '0.7rem', color: wb.borderStrong, mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Your workspace:{' '}
            <Box component="span" sx={{ fontWeight: 600, color: wb.inkLight, opacity: 0.5 }}>
              {tenantSlug || 'workspace'}.letispos.app
            </Box>
          </Typography>
        </Box>

        {/* First / Last name */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
          <Box flex={1} minWidth={0}>
            <Typography component="label" htmlFor="firstName" sx={labelSx}>
              First name
            </Typography>
            <TextField
              id="firstName"
              name="firstName"
              placeholder="Juma"
              fullWidth
              value={firstName}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value)}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
                    <IconUser size={17} stroke={1.6} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Box flex={1} minWidth={0}>
            <Typography component="label" htmlFor="lastName" sx={labelSx}>
              Last name
            </Typography>
            <TextField
              id="lastName"
              name="lastName"
              placeholder="Mwangi"
              fullWidth
              value={lastName}
              autoComplete="family-name"
              onChange={(e) => setLastName(e.target.value)}
              sx={fieldSx}
            />
          </Box>
        </Stack>

        {/* Email */}
        <Box>
          <Typography component="label" htmlFor="email" sx={labelSx}>
            Email address
          </Typography>
          <TextField
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jumam@example.com"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
                  <IconMail size={17} stroke={1.6} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Password + strength bar */}
        <Box>
          <Typography component="label" htmlFor="password" sx={labelSx}>
            Password
          </Typography>
          <TextField
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: wb.borderStrong }}>
                  <IconLock size={17} stroke={1.6} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    sx={{ color: wb.borderStrong }}
                  >
                    {showPassword ? <IconEye size={17} /> : <IconEyeOff size={17} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {password.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
              {[1, 2, 3, 4].map((seg) => (
                <Box
                  key={seg}
                  sx={{
                    height: 3,
                    flex: 1,
                    borderRadius: '3px',
                    bgcolor: passwordStrength >= seg ? strengthColors[passwordStrength] : wb.border,
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </Stack>
          )}
          {password.length > 0 && password.length < 8 && (
            <Typography sx={{ fontSize: '0.7rem', color: wb.clay, mt: 0.5 }}>
              Password must be at least 8 characters
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Submit */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={submitting || !isFormReady}
        startIcon={
          submitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : undefined
        }
        sx={{
          mt: 3.5,
          py: 1.5,
          fontSize: '0.9rem',
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '-0.01em',
          borderRadius: wb.radius.md,
          bgcolor: wb.ink,
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          },
          '&:hover': {
            bgcolor: '#2a2a24',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 20px rgba(26,26,22,0.15)',
          },
          '&.Mui-disabled': {
            bgcolor: wb.border,
            color: wb.borderStrong,
          },
        }}
      >
        {submitting ? 'Creating account…' : 'Start free trial →'}
      </Button>

      {/* Footer */}
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent="center"
        sx={{ mt: 2.5 }}
      >
        <Typography sx={{ fontSize: '0.8rem', color: wb.inkLight, opacity: 0.6 }}>
          Already have an account?
        </Typography>
        <Typography
          component={Link}
          to="/auth/login"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: wb.greenMid,
            textDecoration: 'none',
            '&:hover': { color: wb.green },
          }}
        >
          Sign in
        </Typography>
      </Stack>

      {subtitle}
    </Box>
  );
};

export default AuthRegister;
```

- [ ] **Step 2: Remove unused imports from old wizard**

The new file doesn't need `Card`, `CardContent`, `keyframes`, `useEffect`, `useSearchParams`, `listPlans`, `PlanDefinition`, `IconArrowLeft`, `IconArrowRight`, `IconCheck`, `IconPhone`, `Divider`, etc. The import list above is already clean.

- [ ] **Step 3: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/authentication/authForms/AuthRegister.tsx
git commit -m "feat: replace 3-step registration wizard with single-page quick signup"
```

---

### Task 4: AuthLoginForm — remove Google SSO button

**Files:**
- Modify: `frontend/src/views/smartpos/auth/AuthLoginForm.tsx`

- [ ] **Step 1: Remove the Google SSO button and divider**

In `AuthLoginForm.tsx`, remove the `Divider` and Google `Button` (lines 269–300):

```tsx
// DELETE these lines (269–300):
// <Divider ...> or continue with </Divider>
// <Button ...> Continue with Google </Button>

// The form should go directly from the submit Button to the footer Stack:
```

The form structure after the submit `Button` becomes:

```tsx
      </Button>

      <Stack
        direction="row"
        spacing={0.5}
        justifyContent="center"
        sx={{ mt: { xs: 1.4, sm: 2.5 } }}
      >
        <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[500] }}>
          Don&apos;t have an account?
        </Typography>
        <Typography
          component={Link}
          to="/auth/register"
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: brand.primary[600],
            textDecoration: 'none',
            '&:hover': { color: brand.primary[700], textDecoration: 'underline' },
          }}
        >
          Create account
        </Typography>
      </Stack>
```

- [ ] **Step 2: Remove GoogleG component and unused imports**

Remove the `GoogleG` function component (lines 34-53) entirely.

Remove `Divider` from the MUI import at line 11.

- [ ] **Step 3: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/auth/AuthLoginForm.tsx
git commit -m "fix: remove non-functional Google SSO button from login form"
```

---

### Task 5: OnboardingBanner — enhanced welcome state

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/OnboardingBanner.tsx`

- [ ] **Step 1: Add numbered step indicators and merge trial info**

Replace the existing banner content with a richer first-login version. When `state.percent <= 20` (fresh workspace), show numbered steps. Otherwise show the existing progress-based layout.

```tsx
import { useState } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { wb } from 'src/theme/smartpos/warmBrutalism';
import SetupWizard from 'src/views/smartpos/onboarding/SetupWizard';

const STEP_INFO: Record<string, { label: string; cta: string; path: string }> = {
  warehouse: { label: 'Add your first warehouse', cta: 'Add Warehouse', path: '/smartpos/warehouses' },
  tax: { label: 'Set up tax rules', cta: 'Configure Tax', path: '/smartpos/settings/tax-pricing' },
  products: { label: 'Import your products', cta: 'Smart Import', path: '/smartpos/products' },
  firstSale: { label: 'Record your first sale', cta: 'Open POS', path: '/smartpos/pos' },
};

const SETUP_STEPS = [
  { key: 'warehouse', label: 'Add warehouse' },
  { key: 'tax' as const, label: 'Configure tax' },
  { key: 'products', label: 'Add products' },
  { key: 'firstSale', label: 'First sale' },
];

export default function OnboardingBanner() {
  const { state, dismissBanner, bannerDismissed } = useOnboarding();
  const { user, tenants, isTrialing, getTrialDaysLeft } = useAuth();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (state.isComplete || bannerDismissed) return null;

  const isFirstLogin = state.percent <= 20;
  const trialDays = getTrialDaysLeft();
  const tenantPlan = tenants[0]?.billingPlan ?? 'STARTER';

  const currentStepIndex = SETUP_STEPS.findIndex((s) => !state[s.key]);
  const nextStep = Object.entries(STEP_INFO).find(([key]) => !state[key as keyof typeof state]);

  return (
    <>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: wb.radius.xl,
          border: isFirstLogin ? 'none' : `1px solid ${wb.border}`,
          bgcolor: isFirstLogin ? wb.ink : wb.paper,
          color: isFirstLogin ? wb.paper : wb.ink,
          position: 'relative',
          overflow: 'hidden',
          ...(isFirstLogin && {
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 20% 30%, rgba(194,132,58,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(46,125,58,0.06) 0%, transparent 50%)',
              pointerEvents: 'none',
            },
          }),
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          gap={2}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isFirstLogin ? (
              <>
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: wb.gold,
                    mb: 0.75,
                  }}
                >
                  Your workspace is ready
                </Typography>
                <Typography
                  sx={{
                    fontFamily: wb.font.display,
                    fontSize: { xs: '1.15rem', md: '1.3rem' },
                    fontWeight: 500,
                    letterSpacing: '-0.015em',
                    mb: 0.75,
                    color: wb.paper,
                  }}
                >
                  Welcome{user?.firstName ? `, ${user.firstName}` : ''}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    color: 'rgba(250,250,247,0.6)',
                    mb: 2,
                  }}
                >
                  Set up your store and make your first sale. Three quick steps.
                </Typography>

                {/* Numbered steps */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {SETUP_STEPS.map((step, i) => {
                    const done = state[step.key] === true;
                    const current = i === currentStepIndex;
                    return (
                      <Stack key={step.key} direction="row" alignItems="center" spacing={0.75}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            ...(done
                              ? { bgcolor: 'rgba(46,125,58,0.3)', color: '#4ade80' }
                              : current
                                ? { bgcolor: 'rgba(194,132,58,0.3)', color: wb.gold, boxShadow: `0 0 0 3px rgba(194,132,58,0.15)` }
                                : { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }),
                          }}
                        >
                          {done ? '✓' : i + 1}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.72rem',
                            fontWeight: current ? 600 : 400,
                            color: current ? wb.gold : done ? 'rgba(250,250,247,0.5)' : 'rgba(250,250,247,0.3)',
                            display: { xs: 'none', sm: 'inline' },
                          }}
                        >
                          {step.label}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: 14, md: 15 }, color: wb.ink }}>
                  🚀 {state.percent}% complete — {nextStep?.[1].label}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={state.percent}
                  sx={{
                    mt: 1,
                    height: 6,
                    borderRadius: '3px',
                    bgcolor: wb.border,
                    '& .MuiLinearProgress-bar': { bgcolor: wb.greenMid, borderRadius: '3px' },
                  }}
                />
              </>
            )}
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Plan + trial stat boxes (first login only) */}
            {isFirstLogin && (
              <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' } }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: wb.radius.md,
                    px: 2,
                    py: 1.5,
                    textAlign: 'center',
                    minWidth: 80,
                  }}
                >
                  <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(250,250,247,0.45)' }}>
                    Your plan
                  </Typography>
                  <Typography sx={{ fontFamily: wb.font.display, fontSize: '1rem', fontWeight: 600, color: wb.paper, lineHeight: 1 }}>
                    {tenantPlan.charAt(0) + tenantPlan.slice(1).toLowerCase()}
                  </Typography>
                </Box>
                {isTrialing() && trialDays !== null && (
                  <Box
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: wb.radius.md,
                      px: 2,
                      py: 1.5,
                      textAlign: 'center',
                      minWidth: 80,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(250,250,247,0.45)' }}>
                      Trial ends
                    </Typography>
                    <Typography sx={{ fontFamily: wb.font.display, fontSize: '1rem', fontWeight: 600, color: wb.paper, lineHeight: 1 }}>
                      {trialDays} days
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            <Button
              variant="contained"
              size="small"
              endIcon={<IconChevronRight size={16} />}
              onClick={() => (isFirstLogin ? setWizardOpen(true) : navigate(nextStep![1].path))}
              sx={{
                bgcolor: isFirstLogin ? wb.gold : wb.greenMid,
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: wb.radius.md,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: isFirstLogin ? '#d4953f' : wb.green },
              }}
            >
              {isFirstLogin ? 'Start guided setup' : nextStep![1].cta}
            </Button>

            <IconButton
              size="small"
              onClick={dismissBanner}
              sx={{
                color: isFirstLogin ? 'rgba(255,255,255,0.4)' : wb.borderStrong,
                flexShrink: 0,
                '&:hover': {
                  color: isFirstLogin ? 'rgba(255,255,255,0.7)' : wb.inkLight,
                },
              }}
            >
              <IconX size={16} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <SetupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/OnboardingBanner.tsx
git commit -m "feat: enhance onboarding banner with numbered steps and trial stat boxes"
```

---

### Task 6: DashboardPage — welcome state, empty states, tiered trial messaging

**Files:**
- Modify: `frontend/src/views/smartpos/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add empty state cards when dashboard has no data**

In `DashboardPage.tsx`, after the `OnboardingBanner` and before the trial Alert, add empty state rendering. Replace the existing trial Alert block (lines 316-335) with tiered messaging.

First, add imports at the top:

```tsx
import { wb } from 'src/theme/smartpos/warmBrutalism';
```

Replace the trial Alert block (lines 316-335):

```tsx
      {/* Tiered trial messaging */}
      {isTrialing() && (() => {
        const daysLeft = getTrialDaysLeft();
        if (daysLeft === null) return null;
        if (daysLeft > 21) return null; // Days 1-21: no urgency
        if (daysLeft > 7) {
          // Days 22-27: gentle reminder
          return (
            <Alert
              severity="info"
              sx={{ mb: 3, borderRadius: wb.radius.md }}
              action={
                <Button color="inherit" size="small" component={Link} to="/smartpos/billing">
                  Subscribe Now
                </Button>
              }
            >
              <Typography variant="body2" fontWeight={600}>
                {daysLeft} days left in your free trial.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subscribe to keep your data and unlock all features on the {tenants[0]?.billingPlan ?? 'STARTER'} plan.
              </Typography>
            </Alert>
          );
        }
        // Days 28-30: urgency
        return (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: wb.radius.md }}
            action={
              <Button color="inherit" size="small" component={Link} to="/smartpos/billing">
                Subscribe Now
              </Button>
            }
          >
            <Typography variant="body2" fontWeight={600}>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left — subscribe now to avoid interruption.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your {tenants[0]?.billingPlan ?? 'STARTER'} plan trial is ending soon. Your data will be preserved.
            </Typography>
          </Alert>
        );
      })()}
```

- [ ] **Step 2: Add empty state cards when no sales data exists**

After the KPI Grid and before the regular dashboard content, add empty-state placeholder cards when `data` exists but has zero sales:

```tsx
      {/* Empty state — shown when dashboard has no data yet */}
      {data && data.sales.net === 0 && data.sales.count === 0 && (
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          {[
            { icon: '📊', title: "Today's sales", desc: 'Data appears after your first sale' },
            { icon: '📦', title: 'Inventory overview', desc: 'Import products to see stock levels' },
            { icon: '💰', title: 'Cash in hand', desc: 'Open a cash register to begin' },
          ].map((card) => (
            <Grid key={card.title} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: 180,
                  bgcolor: wb.paper,
                  border: `1px dashed ${wb.border}`,
                  borderRadius: wb.radius.lg,
                  p: 3,
                }}
              >
                <Typography sx={{ fontSize: '2rem', mb: 1, opacity: 0.5 }}>{card.icon}</Typography>
                <Typography
                  sx={{
                    fontFamily: wb.font.display,
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: wb.ink,
                    opacity: 0.5,
                    mb: 0.5,
                  }}
                >
                  {card.title}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: wb.inkLight, opacity: 0.35 }}>
                  {card.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
```

Insert this between the trial Alert block and the `{loading && !data ? ...}` block (before line 353).

- [ ] **Step 3: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/dashboard/DashboardPage.tsx
git commit -m "feat: add empty state cards and tiered trial messaging to dashboard"
```

---

### Task 7: PlanGate — add trial note to lock screen

**Files:**
- Modify: `frontend/src/routes/smartpos/PlanGate.tsx`

- [ ] **Step 1: Add trial note beneath the upgrade button**

In `PlanGate.tsx`, add the trial note. Import `useAuth` and add the trial message.

Replace the existing return block (lines 18-34) with:

```tsx
import { useAuth } from 'src/context/smartpos/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router';

interface PlanGateProps {
  minPlan: string;
  featureName: string;
  children: React.ReactNode;
}

export default function PlanGate({ minPlan, featureName, children }: PlanGateProps) {
  const { tenants, isTrialing } = useAuth();
  const currentPlan = tenants[0]?.billingPlan ?? 'STARTER';
  const hasAccess = (PLAN_LEVEL[currentPlan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);

  if (!hasAccess) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
        <IconLock size={48} color="#94A3B8" />
        <Typography variant="h5" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
          {featureName} requires {minPlan} plan or higher
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your current plan ({currentPlan}) doesn&apos;t include this feature.
          Upgrade to unlock it.
        </Typography>
        <Button variant="contained" component={Link} to="/smartpos/billing">
          Upgrade Plan
        </Button>
        {isTrialing() && (
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1.5, color: 'text.disabled' }}
          >
            Still in your 30-day trial. You won&apos;t be charged until it ends.
          </Typography>
        )}
      </Box>
    );
  }

  return <>{children}</>;
}
```

The changes from the current file:
1. Add `useAuth` import
2. Add `isTrialing` destructure
3. Add the trial note `Typography` below the `Button`

- [ ] **Step 2: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/smartpos/PlanGate.tsx
git commit -m "feat: add trial note to PlanGate lock screen"
```

---

### Task 8: LimitGate — plan limit toast component

**Files:**
- Create: `frontend/src/components/smartpos/LimitGate.tsx`

- [ ] **Step 1: Create the LimitGate component**

```tsx
/**
 * LimitGate — in-page toast when user hits or approaches a plan limit.
 *
 * Renders a dismissible card (not a modal). Two variants:
 * - "reached": Hard limit hit (e.g., 2/2 users). Warning tone, upgrade CTA.
 * - "approaching": Limit near (e.g., 1/1 store, adding another). Info tone, see-plans CTA.
 *
 * Usage: <LimitGate current={users.length} max={tenant.maxUsers} resource="users" />
 */
import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { Link } from 'react-router';
import { wb } from 'src/theme/smartpos/warmBrutalism';

interface LimitGateProps {
  current: number;
  max: number;
  resource: 'users' | 'stores' | 'products';
  /** Show "approaching" variant at this ratio (default 1.0 = only when reached) */
  warnAt?: number; // 0–1 ratio of current/max
}

const RESOURCE_LABELS: Record<string, { singular: string; plural: string }> = {
  users: { singular: 'user', plural: 'users' },
  stores: { singular: 'store', plural: 'stores' },
  products: { singular: 'product', plural: 'products' },
};

export default function LimitGate({ current, max, resource, warnAt = 1.0 }: LimitGateProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const ratio = current / max;
  const isReached = current >= max;
  const isApproaching = ratio >= warnAt && !isReached;

  if (!isReached && !isApproaching) return null;

  const labels = RESOURCE_LABELS[resource] ?? { singular: resource, plural: `${resource}s` };
  const label = current === 1 ? labels.singular : labels.plural;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: wb.radius.lg,
        border: `1px solid ${isReached ? 'rgba(194,132,58,0.2)' : '#bfdbfe'}`,
        bgcolor: isReached ? wb.goldLight : '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontSize: '1.3rem' }}>{isReached ? '⚠' : 'ℹ'}</Typography>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: isReached ? '#92400e' : '#1e40af' }}>
            {isReached
              ? `${label.charAt(0).toUpperCase() + label.slice(1)} limit reached — ${current} of ${max}`
              : `Adding more ${label}?`}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: isReached ? '#a16207' : '#3b82f6', lineHeight: 1.4 }}>
            {isReached
              ? `Upgrade to a higher plan to add more ${label}.`
              : `Your current plan supports ${max} ${label}. Upgrade to add more.`}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          component={Link}
          to="/smartpos/billing"
          size="small"
          sx={{
            bgcolor: isReached ? wb.gold : '#2563eb',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            borderRadius: wb.radius.md,
            px: 2,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: isReached ? '#d4953f' : '#1d4ed8' },
          }}
        >
          {isReached ? 'Upgrade →' : 'See plans →'}
        </Button>
        <Button
          size="small"
          onClick={() => setDismissed(true)}
          sx={{
            minWidth: 0,
            p: 0.5,
            color: isReached ? '#a16207' : '#64748b',
            '&:hover': { bgcolor: 'transparent', opacity: 0.7 },
          }}
        >
          <IconX size={14} />
        </Button>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/LimitGate.tsx
git commit -m "feat: add LimitGate component for plan limit toasts"
```

---

### Task 9: Integration test — quick signup flow

**Files:**
- Create: `frontend/tests/auth/signup-flow.spec.ts`

- [ ] **Step 1: Write the Playwright test for the quick signup flow**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Quick signup flow', () => {
  test('renders single-page signup form', async ({ page }) => {
    await page.goto('/auth/register');

    // Should show Warm Brutalism login page with single form (no step indicators)
    await expect(page.getByText('30-day free trial')).toBeVisible();
    await expect(page.getByText('No credit card')).toBeVisible();

    // Should have all required fields on one page
    await expect(page.getByLabel('Business name')).toBeVisible();
    await expect(page.getByLabel('Workspace URL')).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Should NOT show plan selection cards from old wizard
    await expect(page.getByText('Choose your plan')).not.toBeVisible();

    // Should show plan chip with Starter mention
    await expect(page.getByText(/Starter/)).toBeVisible();

    // Submit button should say "Start free trial"
    await expect(page.getByRole('button', { name: /Start free trial/ })).toBeVisible();
  });

  test('password strength meter shows for valid input', async ({ page }) => {
    await page.goto('/auth/register');

    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill('weak');

    // Should show validation message
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    // Fill a strong password
    await passwordInput.fill('StrongP@ss1');
    await expect(page.getByText('Password must be at least 8 characters')).not.toBeVisible();
  });

  test('slug auto-generation from business name', async ({ page }) => {
    await page.goto('/auth/register');

    await page.getByLabel('Business name').fill('Mwanza General Stores');
    const slugInput = page.getByLabel('Workspace URL');
    await expect(slugInput).toHaveValue('mwanza-general-stores');
  });

  test('login page has no Google SSO button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByText('Continue with Google')).not.toBeVisible();
    await expect(page.getByText('or continue with')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd frontend && npx playwright test tests/auth/signup-flow.spec.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/auth/signup-flow.spec.ts
git commit -m "test: add Playwright tests for quick signup flow"
```

---

## Completion Checklist

- [ ] `warmBrutalism.ts` created with full palette, shadows, radii, fonts
- [ ] `LetisAuthLayout.tsx` left column redesigned for register mode
- [ ] `AuthRegister.tsx` replaced with single-page quick signup
- [ ] `AuthLoginForm.tsx` Google SSO button removed
- [ ] `OnboardingBanner.tsx` enhanced with numbered steps + trial stat boxes
- [ ] `DashboardPage.tsx` tiered trial messaging + empty state cards
- [ ] `PlanGate.tsx` trial note added
- [ ] `LimitGate.tsx` component created
- [ ] Playwright tests pass
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Manual smoke test: register → verify → dashboard → view upgrade prompt
