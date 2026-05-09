# Unified Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the old product-gate setup system and replace it with a single 4-step onboarding wizard driven by the dashboard banner.

**Architecture:** Delete `SetupPage.tsx` and `useSetupGate.tsx`. Strip setup gating from `RequireAuth`. Reduce `SetupWizard` to 4 essential steps wired to `OnboardingContext` for persistence. Redesign `FirstSaleGuide` as a two-part walkthrough with a stock-up reminder. Remove staff from the wizard and the onboarding percent calculation.

**Tech Stack:** React 19, TypeScript, MUI 6, react-router v7

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/views/smartpos/onboarding/SetupPage.tsx` | **DELETE** — old product-gate wizard |
| `src/routes/smartpos/useSetupGate.tsx` | **DELETE** — product-count check hook |
| `src/routes/smartpos/RequireAuth.tsx` | **MODIFY** — strip setup gate, keep auth/permission |
| `src/routes/Router.tsx` | **MODIFY** — remove `/smartpos/setup` route and import |
| `src/context/smartpos/OnboardingContext.tsx` | **MODIFY** — remove `staff` from step-tracking arrays |
| `src/views/smartpos/onboarding/SetupWizard.tsx` | **MODIFY** — 4 steps, wire `completeStep` on actual completion |
| `src/views/smartpos/onboarding/steps/FirstSaleGuide.tsx` | **MODIFY** — stock-up reminder + selling walkthrough |
| `src/views/smartpos/dashboard/OnboardingBanner.tsx` | **MODIFY** — remove staff step, update threshold to 20% |
| `src/views/smartpos/dashboard/DashboardPage.tsx` | **MODIFY** — remove auto-open wizard `useEffect` |

---

### Task 1: Delete old setup system files

**Files:**
- Delete: `src/views/smartpos/onboarding/SetupPage.tsx`
- Delete: `src/routes/smartpos/useSetupGate.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm src/views/smartpos/onboarding/SetupPage.tsx
rm src/routes/smartpos/useSetupGate.tsx
```

- [ ] **Step 2: Verify no remaining imports reference these files**

```bash
grep -r "SetupPage\|useSetupGate" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results (clean).

- [ ] **Step 3: Commit**

```bash
git add src/views/smartpos/onboarding/SetupPage.tsx src/routes/smartpos/useSetupGate.tsx
git commit -m "feat: remove old product-gate setup system"
```

---

### Task 2: Strip setup gate from RequireAuth

**Files:**
- Modify: `src/routes/smartpos/RequireAuth.tsx`

- [ ] **Step 1: Remove setup gate logic**

Replace the entire file content:

```tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';

/**
 * Wrap any route element that requires authentication.
 */
export function RequireAuth({
  children, perm, role,
}: { children: React.ReactNode; perm?: string; role?: string }) {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  if (perm && !hasPermission(perm)) {
    return <Navigate to="/auth/403" replace />;
  }
  if (role && !hasRole(role)) {
    return <Navigate to="/auth/403" replace />;
  }
  return <>{children}</>;
}

/** Render children only if the current user has the given permission. */
export function PermissionGate({
  perm, children, fallback = null,
}: { perm: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { hasPermission } = useAuth();
  return <>{hasPermission(perm) ? children : fallback}</>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors related to RequireAuth.

- [ ] **Step 3: Commit**

```bash
git add src/routes/smartpos/RequireAuth.tsx
git commit -m "feat: remove setup gating from RequireAuth"
```

---

### Task 3: Remove setup route from Router

**Files:**
- Modify: `src/routes/Router.tsx`

- [ ] **Step 1: Remove SetupPage lazy import**

Delete lines 182-184 (the `SetupPage` Loadable declaration):
```tsx
const SetupPage = Loadable(
  lazy(() => import('../views/smartpos/onboarding/SetupPage')),
);
```

- [ ] **Step 2: Remove `/smartpos/setup` route**

Delete line 475 inside the `/smartpos` children array:
```tsx
{ path: 'setup', element: <SetupPage /> },
```

- [ ] **Step 3: Verify no remaining SetupPage references in Router**

```bash
grep -n "SetupPage\|setup" src/routes/Router.tsx
```

Expected: Only the line containing the route for `{ path: 'setup', ... }` should be gone.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Router.tsx
git commit -m "feat: remove /smartpos/setup route from router"
```

---

### Task 4: Update OnboardingContext — remove staff from tracking

**Files:**
- Modify: `src/context/smartpos/OnboardingContext.tsx`

- [ ] **Step 1: Update steps arrays to exclude `staff`**

Replace the `completeStep` callback body (lines 52-65). The steps array changes from 6 steps to 5 (remove `staff`). Also fix a pre-existing bug where the `first_sale` step key (snake_case from the API type) didn't map to the camelCase `firstSale` state property — this prevented the banner from ever detecting first_sale as complete:

```tsx
const completeStep = React.useCallback(async (step: OnboardingStep) => {
  await updateOnboardingStep(step, true);
  setState((prev) => {
    const stateKey = step === 'first_sale' ? 'firstSale' : step;
    const next = { ...prev, [stateKey]: true };
    const steps: (keyof OnboardingState)[] = ['workspace', 'warehouse', 'tax', 'products', 'firstSale'];
    const completed = steps.filter((k) => next[k]).length;
    return {
      ...next,
      percent: Math.round((completed / steps.length) * 100),
      isComplete: completed === steps.length,
      completedAt: completed === steps.length ? new Date().toISOString() : prev.completedAt,
    };
  });
}, []);
```

Replace the `resetOnboarding` callback body (lines 76-85). Same steps array update, and remove `'staff'` from the reset list:

```tsx
const resetOnboarding = React.useCallback(async () => {
  const steps: OnboardingStep[] = ['workspace', 'warehouse', 'tax', 'products', 'first_sale'];
  await Promise.all(steps.map((s) => updateOnboardingStep(s, false)));
  setState(DEFAULT_STATE);
  setBannerDismissed(false);
  try {
    localStorage.removeItem(BANNER_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}, []);
```

Also update the default state (lines 18-28) — remove `staff: false`:

```tsx
const DEFAULT_STATE: OnboardingState = {
  workspace: true,
  warehouse: false,
  tax: false,
  products: false,
  firstSale: false,
  percent: 20,
  isComplete: false,
  completedAt: null,
};
```

- [ ] **Step 2: Verify OnboardingState type still includes `staff` for API compatibility**

```bash
grep -n "staff" src/api/smartpos/onboarding.ts
```

The API type keeps `staff: boolean` and `'staff'` in `OnboardingStep`. This is fine — the backend still tracks it, the frontend just doesn't count it toward onboarding completion.

- [ ] **Step 3: Commit**

```bash
git add src/context/smartpos/OnboardingContext.tsx
git commit -m "feat: remove staff step from onboarding percent tracking"
```

---

### Task 5: Redesign FirstSaleGuide

**Files:**
- Modify: `src/views/smartpos/onboarding/steps/FirstSaleGuide.tsx`

- [ ] **Step 1: Replace with stock-up reminder + selling walkthrough**

```tsx
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  IconArrowRight,
  IconCircleNumber1,
  IconCircleNumber2,
  IconCircleNumber3,
  IconShoppingCart,
  IconTruck,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  onComplete: () => void;
}

export default function FirstSaleGuide({ onComplete }: Props) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        Ready to make your first sale?
      </Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        Follow these steps to start selling. Stock up first — you can't sell what you don't have.
      </Typography>

      <Stack spacing={2.5}>
        {/* Stock-up warning card */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: '#FFFBEB',
            border: `1px solid ${brand.warning.light}`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <IconTruck size={22} color={brand.warning.main} style={{ marginTop: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14, color: brand.neutral[900], mb: 0.5 }}>
                Stock up first
              </Typography>
              <Typography sx={{ fontSize: 13, color: brand.neutral[600], mb: 1.5 }}>
                You need products in stock before you can sell. Import opening stock or record a purchase.
              </Typography>
              <Button
                component={Link}
                to="/smartpos/purchases/new"
                variant="outlined"
                size="small"
                endIcon={<IconArrowRight size={16} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '8px',
                  borderColor: brand.warning.main,
                  color: brand.warning.main,
                  '&:hover': { borderColor: brand.warning.main, bgcolor: brand.warning.light },
                }}
              >
                Add Stock
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* How selling works — 3-step guide */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: brand.neutral[700], mb: 1.5 }}>
            How selling works
          </Typography>

          <Stack spacing={1.5}>
            <StepRow
              icon={<IconCircleNumber1 size={22} />}
              title="Open the POS terminal"
              description="Launch the point-of-sale screen — this is where you record sales."
            />
            <StepRow
              icon={<IconCircleNumber2 size={22} />}
              title="Add items to cart"
              description="Scan barcodes or search and select products. Adjust quantities as needed."
            />
            <StepRow
              icon={<IconCircleNumber3 size={22} />}
              title="Accept payment & complete"
              description="Choose cash, mobile money, or card. Confirm and print the receipt."
            />
          </Stack>
        </Box>

        {/* Actions */}
        <Button
          component={Link}
          to="/smartpos/pos"
          variant="contained"
          startIcon={<IconShoppingCart size={18} />}
          onClick={onComplete}
          sx={{
            justifyContent: 'flex-start',
            py: 2,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 15,
            bgcolor: brand.primary[600],
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700 }}>Open Point of Sale</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.85 }}>
              Start selling right away
            </Typography>
          </Box>
        </Button>

        <Button
          variant="outlined"
          onClick={onComplete}
          sx={{
            justifyContent: 'flex-start',
            py: 2,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 15,
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700 }}>I'll do this later</Typography>
            <Typography sx={{ fontSize: 12, color: brand.neutral[500] }}>
              Go straight to the dashboard
            </Typography>
          </Box>
        </Button>
      </Stack>
    </Box>
  );
}

function StepRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: brand.primary[500], flexShrink: 0, mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: brand.neutral[900] }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: brand.neutral[500] }}>
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/views/smartpos/onboarding/steps/FirstSaleGuide.tsx
git commit -m "feat: redesign FirstSaleGuide with stock-up reminder and selling walkthrough"
```

---

### Task 6: Update SetupWizard to 4 steps and wire OnboardingContext

**Files:**
- Modify: `src/views/smartpos/onboarding/SetupWizard.tsx`

- [ ] **Step 1: Replace SetupWizard with 4-step version**

```tsx
import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import { useOnboarding } from 'src/context/smartpos/OnboardingContext';
import WarehouseSetup from './steps/WarehouseSetup';
import TaxSetup from './steps/TaxSetup';
import ProductImportSetup from './steps/ProductImportSetup';
import FirstSaleGuide from './steps/FirstSaleGuide';

const STEPS = ['Warehouse', 'Tax Rules', 'Products', 'First Sale'];

const STEP_KEYS: Array<'warehouse' | 'tax' | 'products' | 'first_sale'> = [
  'warehouse',
  'tax',
  'products',
  'first_sale',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SetupWizard({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const { completeStep } = useOnboarding();

  const handleComplete = () => {
    completeStep(STEP_KEYS[activeStep]);
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => setActiveStep((prev) => Math.max(0, prev - 1));

  const handleSkip = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const isLast = activeStep === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px', minHeight: '55vh' } }}
    >
      <Box sx={{ p: 3, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Let us set up Letis POS
        </Typography>
        <Typography sx={{ color: brand.neutral[500], fontSize: 14 }}>
          This takes about 5 minutes. You can skip any step and come back later.
        </Typography>
      </Box>

      <Stepper
        activeStep={activeStep}
        sx={{
          px: 3,
          py: 2,
          '& .MuiStepIcon-root.Mui-active': { color: brand.primary[600] },
          '& .MuiStepIcon-root.Mui-completed': { color: brand.primary[600] },
        }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: 12, fontWeight: 600 } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {activeStep === 0 && <WarehouseSetup onComplete={handleComplete} />}
        {activeStep === 1 && <TaxSetup onComplete={handleComplete} />}
        {activeStep === 2 && <ProductImportSetup onComplete={handleComplete} />}
        {activeStep === 3 && <FirstSaleGuide onComplete={handleComplete} />}
      </DialogContent>

      <Box
        sx={{
          p: 3,
          pt: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!isLast && (
            <Button
              onClick={handleSkip}
              sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[500] }}
            >
              Skip for now
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSkip}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: brand.primary[600],
              px: 3,
            }}
          >
            {isLast ? 'Finish' : 'Skip'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/views/smartpos/onboarding/SetupWizard.tsx
git commit -m "feat: reduce SetupWizard to 4 steps and wire OnboardingContext"
```

---

### Task 7: Update OnboardingBanner — remove staff, match 4-step wizard

**Files:**
- Modify: `src/views/smartpos/dashboard/OnboardingBanner.tsx`

- [ ] **Step 1: Update STEP_INFO and threshold**

Remove the `staff` entry from `STEP_INFO` (lines 24-28). Update the 16% threshold to 20% (since workspace alone is 1/5 = 20% with staff removed). Replace lines 9-35:

```tsx
const STEP_INFO: Record<string, { label: string; cta: string; path: string }> = {
  warehouse: {
    label: 'Add your first warehouse',
    cta: 'Add Warehouse',
    path: '/smartpos/warehouses',
  },
  tax: {
    label: 'Set up tax rules',
    cta: 'Configure Tax',
    path: '/smartpos/settings/tax-pricing',
  },
  products: {
    label: 'Import your products',
    cta: 'Smart Import',
    path: '/smartpos/products',
  },
  firstSale: {
    label: 'Record your first sale',
    cta: 'Open POS',
    path: '/smartpos/pos',
  },
};
```

Also update the CTA button onClick threshold (line 87) — change `state.percent <= 16` to `state.percent <= 20`:

```tsx
onClick={() => (state.percent <= 20 ? setWizardOpen(true) : navigate(path))}
```

And the button text (line 96):

```tsx
{state.percent <= 20 ? 'Start Setup' : cta}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/smartpos/dashboard/OnboardingBanner.tsx
git commit -m "feat: update OnboardingBanner to match 4-step wizard"
```

---

### Task 8: Remove auto-open wizard from DashboardPage

**Files:**
- Modify: `src/views/smartpos/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Remove the auto-open wizard useEffect**

Delete lines 375-381:

```tsx
useEffect(() => {
  // Auto-open wizard on first visit if only workspace step is done
  if (onboardingState.percent <= 16 && !onboardingState.isComplete) {
    const timer = setTimeout(() => setShowWizard(true), 800);
    return () => clearTimeout(timer);
  }
}, [onboardingState.percent, onboardingState.isComplete]);
```

Also remove the `showWizard` state and its declaration on line 356 since it's now only controlled by the banner:

```tsx
const [showWizard, setShowWizard] = useState(false);
```

This is still needed — the `SetupWizard` is rendered at the bottom of the component (line 891) and the `OnboardingBanner` uses its own local `wizardOpen` state. Wait — the DashboardPage renders its own `SetupWizard` instance (line 891):

```tsx
<SetupWizard open={showWizard} onClose={() => setShowWizard(false)} />
```

And the `OnboardingBanner` also renders its own `SetupWizard` instance (line 108 in OnboardingBanner.tsx):

```tsx
<SetupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
```

Since the banner now controls the wizard, the duplicate `SetupWizard` in DashboardPage should be removed. Remove:
- `const [showWizard, setShowWizard] = useState(false);` (line 356)
- The auto-open useEffect (lines 369-381)
- `<SetupWizard open={showWizard} onClose={() => setShowWizard(false)} />` (line 891)

Also remove the now-unused import of `SetupWizard` (line 57):
```tsx
import SetupWizard from 'src/views/smartpos/onboarding/SetupWizard';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/views/smartpos/dashboard/DashboardPage.tsx
git commit -m "feat: remove auto-open wizard from DashboardPage"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run TypeScript check on entire project**

```bash
npx tsc --noEmit --pretty 2>&1 | head -50
```

Expected: No errors.

- [ ] **Step 2: Verify no stale references to deleted files**

```bash
grep -r "SetupPage\|useSetupGate\|SETUP_ALLOWED_ROUTES" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results.

- [ ] **Step 3: Verify the dev server starts**

```bash
npx vite --host 0.0.0.0 &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
kill %1
```

Expected: HTTP 200.

- [ ] **Step 4: Final commit if any cleanup needed**

(Only if verification surfaced issues)
