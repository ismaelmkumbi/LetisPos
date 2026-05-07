# Setup Gate & Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block shop operation until at least one product exists, guide new users through setup wizard.

**Architecture:** A `useSetupGate` hook checks product count via API. `RequireAuth` redirects unconfigured workspaces to a full-page 3-step wizard at `/smartpos/setup`. Units are pre-seeded on registration.

**Tech Stack:** React 19, TypeScript, MUI v7, react-router v7, existing `OnboardingContext`, existing products API

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/routes/smartpos/useSetupGate.tsx` | Create | Hook: check product count, return `{ loading, needsSetup }` |
| `src/routes/smartpos/RequireAuth.tsx` | Modify | Add setup gate redirect to `/smartpos/setup` |
| `src/routes/Router.tsx` | Modify | Add `/smartpos/setup` route + lazy import |
| `src/views/smartpos/onboarding/SetupPage.tsx` | Create | Full-page 3-step wizard (Units → Products → Tax) |
| `src/api/smartpos/products.ts` | Modify | Add `seedDefaultUnits()` API function |
| `src/views/authentication/authForms/AuthRegister.tsx` | Modify | Call seedDefaultUnits after registration |

---

### Task 1: Create useSetupGate hook

**Files:**
- Create: `src/routes/smartpos/useSetupGate.tsx`

- [ ] **Step 1: Write the hook**

```tsx
import { useEffect, useState } from 'react';
import { listProducts } from 'src/api/smartpos/products';

export function useSetupGate() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listProducts({ size: 1 })
      .then((p) => {
        if (!cancelled) setNeedsSetup((p.totalElements ?? 0) === 0);
      })
      .catch(() => {
        if (!cancelled) setNeedsSetup(false); // fail open
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { loading, needsSetup };
}
```

- [ ] **Step 2: Verify hook compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "useSetupGate" | head -5`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/routes/smartpos/useSetupGate.tsx
git commit -m "feat: add useSetupGate hook to check product count"
```

---

### Task 2: Update RequireAuth with setup gate

**Files:**
- Modify: `src/routes/smartpos/RequireAuth.tsx`
- Reference: `src/routes/smartpos/useSetupGate.tsx`

- [ ] **Step 1: Read current RequireAuth**

Read the file to confirm current content.

- [ ] **Step 2: Add setup gate logic**

Add after existing hooks and before the permission checks. Allowed routes during setup: `/smartpos/setup`, `/smartpos/products`, `/smartpos/categories`, `/smartpos/products/units`, `/smartpos/settings`.

```tsx
import { useSetupGate } from './useSetupGate';

// Inside RequireAuth, after the existing hooks:
const { needsSetup, loading: setupLoading } = useSetupGate();
const setupAllowedRoutes = [
  '/smartpos/setup',
  '/smartpos/products',
  '/smartpos/categories',
  '/smartpos/products/units',
  '/smartpos/settings',
];

// After the loading check, before the permission check:
if (!setupLoading && needsSetup) {
  const isSetupRoute = setupAllowedRoutes.some((r) => location.pathname.startsWith(r));
  if (!isSetupRoute) {
    return <Navigate to="/smartpos/setup" state={{ from: location }} replace />;
  }
}
```

- [ ] **Step 3: Verify compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "RequireAuth" | head -5`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/routes/smartpos/RequireAuth.tsx
git commit -m "feat: add setup gate redirect to RequireAuth"
```

---

### Task 3: Add /smartpos/setup route

**Files:**
- Modify: `src/routes/Router.tsx`

- [ ] **Step 1: Add lazy import**

Add near the other lazy imports (around line 300):

```tsx
const SetupPage = Loadable(lazy(() => import('../views/smartpos/onboarding/SetupPage')));
```

- [ ] **Step 2: Add route**

In the SmartPOS protected routes section, add before the wildcard route:

```tsx
{
  path: 'setup',
  element: <SetupPage />,
},
```

- [ ] **Step 3: Verify compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "SetupPage\|Router" | head -10`
Expected: no errors referencing SetupPage

- [ ] **Step 4: Commit**

```bash
git add src/routes/Router.tsx
git commit -m "feat: add /smartpos/setup route"
```

---

### Task 4: Create SetupPage wizard

**Files:**
- Create: `src/views/smartpos/onboarding/SetupPage.tsx`

- [ ] **Step 1: Create SetupPage component**

Full-page 3-step wizard with left step list + right content area. Steps: Units, Products, Tax. Each skippable. Progress bar at top. Completion state when product count > 0.

```tsx
import { useEffect, useState } from 'react';
import { Box, Button, LinearProgress, Stack, Typography, keyframes } from '@mui/material';
import {
  IconCheck, IconCircle, IconPackage, IconPercentage, IconRulerMeasure,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useSetupGate } from 'src/routes/smartpos/useSetupGate';
import { listUnits } from 'src/api/smartpos/products';
import type { Unit } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';

/* ─── Step config ───────────────────────────────────────────────── */

type StepKey = 'units' | 'products' | 'tax';

interface StepDef {
  key: StepKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STEPS: StepDef[] = [
  { key: 'units', label: 'Units of measure', icon: <IconRulerMeasure size={20} />, description: 'Review default units — pieces, kg, liter, and more' },
  { key: 'products', label: 'First product', icon: <IconPackage size={20} />, description: 'Add at least one product to unlock the shop' },
  { key: 'tax', label: 'Tax rate', icon: <IconPercentage size={20} />, description: 'Set your default tax rate for sales' },
];

/* ─── Styles ────────────────────────────────────────────────────── */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─── Step content components ───────────────────────────────────── */

interface StepContentProps {
  onSkip: () => void;
  onComplete: () => void;
}

function UnitsStep({ onSkip, onComplete }: StepContentProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUnits()
      .then((u) => setUnits(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>
          Default units are ready
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: brand.neutral[500] }}>
          These common units are pre-loaded. You can add more from Settings anytime.
        </Typography>
      </Box>

      {loading ? (
        <Typography sx={{ color: brand.neutral[400] }}>Loading units…</Typography>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
          {units.map((u) => (
            <Box
              key={u.id}
              sx={{
                px: 1.5, py: 0.75,
                borderRadius: '8px',
                bgcolor: brand.primary[50],
                border: `1px solid ${brand.primary[100]}`,
                fontSize: '0.82rem', fontWeight: 600, color: brand.primary[700],
              }}
            >
              {u.name} {u.symbol ? `(${u.symbol})` : ''}
            </Box>
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={1.5}>
        <Button variant="outlined" onClick={onSkip} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
          Skip for now
        </Button>
        <Button variant="contained" onClick={onComplete} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
          Looks good, continue
        </Button>
      </Stack>
    </Stack>
  );
}

function ProductsStep({ onSkip, onComplete }: StepContentProps) {
  const { needsSetup } = useSetupGate();

  // Re-check when visiting this step — if products now exist, auto-complete
  useEffect(() => {
    if (!needsSetup) onComplete();
  }, [needsSetup, onComplete]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>
          Add your first product
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: brand.neutral[500] }}>
          At least one product is required before you can make sales. Add it now or use the product catalog.
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={() => window.open('/smartpos/products/new', '_self')}
        sx={{
          alignSelf: 'flex-start',
          px: 3, py: 1.5,
          borderRadius: '10px',
          textTransform: 'none', fontWeight: 700,
          background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
          '&:hover': { background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)` },
        }}
      >
        Go to product catalog
      </Button>

      <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[400] }}>
        After adding your first product, return here and the wizard will continue automatically.
      </Typography>

      <Button variant="text" onClick={onSkip} sx={{ alignSelf: 'flex-start', textTransform: 'none', color: brand.neutral[500] }}>
        Skip for now
      </Button>
    </Stack>
  );
}

function TaxStep({ onSkip, onComplete }: StepContentProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: brand.neutral[900] }}>
          Tax configuration
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: brand.neutral[500] }}>
          A default tax rate is applied to all sales. You can change this anytime in Settings.
        </Typography>
      </Box>

      <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: brand.neutral[50], border: `1px solid ${brand.neutral[200]}` }}>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
          Default rate
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: brand.neutral[900] }}>
          18% VAT
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: brand.neutral[500], mt: 0.5 }}>
          Standard rate for Tanzania. Adjust in Settings → Tax & Pricing.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1.5}>
        <Button variant="outlined" onClick={onSkip} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}>
          I'll set this later
        </Button>
        <Button variant="contained" onClick={onComplete} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
          Continue
        </Button>
      </Stack>
    </Stack>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function SetupPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<Set<StepKey>>(new Set(['units'])); // units pre-completed since pre-seeded
  const [allDone, setAllDone] = useState(false);
  const { needsSetup, loading } = useSetupGate();
  const nav = useNavigate();

  // If products now exist (added via catalog), mark as done
  useEffect(() => {
    if (!loading && !needsSetup && !allDone) {
      setAllDone(true);
    }
  }, [loading, needsSetup, allDone]);

  const handleComplete = (key: StepKey) => {
    setCompleted((prev) => new Set([...prev, key]));
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    } else if (!needsSetup) {
      setAllDone(true);
    }
  };

  const handleSkip = (key: StepKey) => {
    setCompleted((prev) => new Set([...prev, key]));
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    }
  };

  const progress = (completed.size / STEPS.length) * 100;

  /* ── Completion state ── */
  if (allDone || (!loading && !needsSetup)) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 3, py: 10, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: brand.success.light,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3,
          }}
        >
          <IconCheck size={40} color={brand.success.dark} stroke={2.5} />
        </Box>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: brand.neutral[900] }}>
          You're all set!
        </Typography>
        <Typography sx={{ mt: 1, fontSize: '0.9rem', color: brand.neutral[500] }}>
          Your workspace is ready to make sales.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => nav('/smartpos/dashboard')}
          sx={{
            mt: 3, px: 4, py: 1.5,
            borderRadius: '10px', textTransform: 'none', fontWeight: 700,
            background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
          }}
        >
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  /* ── Wizard layout ── */
  const CurrentStepContent = (() => {
    const key = STEPS[activeStep].key;
    const props: StepContentProps = {
      onSkip: () => handleSkip(key),
      onComplete: () => handleComplete(key),
    };
    switch (key) {
      case 'units': return <UnitsStep {...props} />;
      case 'products': return <ProductsStep {...props} />;
      case 'tax': return <TaxStep {...props} />;
    }
  })();

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
      {/* Progress */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand.neutral[600] }}>
            Setting up Letis POS
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand.primary[600] }}>
            {Math.round(progress)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: brand.neutral[100],
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: `linear-gradient(90deg, ${brand.primary[500]}, ${brand.primary[700]})`,
            },
          }}
        />
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        {/* Left: step list */}
        <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
          <Stack spacing={0.5}>
            {STEPS.map((step, i) => {
              const isCurrent = i === activeStep;
              const isDone = completed.has(step.key);
              return (
                <Box
                  key={step.key}
                  onClick={() => { if (isDone) setActiveStep(i); }}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    px: 1.5, py: 1.25,
                    borderRadius: '10px',
                    cursor: isDone ? 'pointer' : 'default',
                    bgcolor: isCurrent ? brand.primary[50] : 'transparent',
                    border: isCurrent ? `1px solid ${brand.primary[100]}` : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    animation: `${fadeInUp} 0.4s ease ${i * 100}ms both`,
                  }}
                >
                  <Box sx={{ mt: 0.25, color: isDone ? brand.primary[600] : brand.neutral[300] }}>
                    {isDone ? <IconCheck size={18} stroke={2.5} /> : <IconCircle size={18} />}
                  </Box>
                  <Box>
                    <Typography sx={{
                      fontSize: '0.85rem',
                      fontWeight: isCurrent ? 700 : 600,
                      color: isCurrent ? brand.primary[700] : brand.neutral[600],
                    }}>
                      {step.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: brand.neutral[400], mt: 0.15 }}>
                      {step.description}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Right: step content */}
        <Box sx={{ flex: 1, minWidth: 0, animation: `${fadeInUp} 0.4s ease both` }}>
          {CurrentStepContent}
        </Box>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "SetupPage" | head -5`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/views/smartpos/onboarding/SetupPage.tsx
git commit -m "feat: add SetupPage full-page wizard with units, products, tax steps"
```

---

### Task 5: Pre-seed units on registration

**Files:**
- Create: `src/api/smartpos/products.ts` lines added (seedDefaultUnits)
- Modify: `src/views/authentication/authForms/AuthRegister.tsx`

- [ ] **Step 1: Add seedDefaultUnits API function**

Add to `src/api/smartpos/products.ts` after the `createUnit` function:

```tsx
const DEFAULT_UNITS = [
  { name: 'Pieces', symbol: 'pcs' },
  { name: 'Kilogram', symbol: 'kg' },
  { name: 'Liter', symbol: 'L' },
  { name: 'Meter', symbol: 'm' },
  { name: 'Box', symbol: 'box' },
  { name: 'Pack', symbol: 'pk' },
  { name: 'Bottle', symbol: 'btl' },
  { name: 'Can', symbol: 'can' },
  { name: 'Dozen', symbol: 'doz' },
  { name: 'Pair', symbol: 'pr' },
];

export async function seedDefaultUnits(): Promise<Unit[]> {
  const results: Unit[] = [];
  for (const unit of DEFAULT_UNITS) {
    try {
      const created = await createUnit(unit);
      results.push(created);
    } catch {
      // Unit may already exist — skip
    }
  }
  return results;
}
```

- [ ] **Step 2: Call seedDefaultUnits after registration**

In `AuthRegister.tsx`, after successful `register()` call, fire-and-forget:

```tsx
// After: navigate('/auth/login', { state: { registered: true } });
// Add:
seedDefaultUnits().catch(() => {});
```

Add import: `import { seedDefaultUnits } from 'src/api/smartpos/products';`

- [ ] **Step 3: Verify compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "seedDefaultUnits\|AuthRegister" | head -5`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/api/smartpos/products.ts src/views/authentication/authForms/AuthRegister.tsx
git commit -m "feat: pre-seed default units on workspace registration"
```

## Self-Review

**Spec coverage:**
- [x] useSetupGate hook — Task 1
- [x] RequireAuth gate — Task 2
- [x] /smartpos/setup route — Task 3
- [x] Full-page wizard (Units → Products → Tax) — Task 4
- [x] Pre-seed units — Task 5

**Placeholder scan:** No TODOs, TBDs, or incomplete sections.

**Type consistency:** StepKey union matches STEPS array and switch statement. useSetupGate return type consistent across Tasks 1, 2, and 4. Unit type imported from correct path.
