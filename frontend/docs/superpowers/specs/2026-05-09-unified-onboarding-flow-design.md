# Unified Onboarding Flow

## Summary

Remove the dual onboarding system (product-gate setup page + dashboard wizard) and replace it with a single, smooth onboarding flow driven by the dashboard banner and 4-step wizard.

## Problem

Two separate onboarding systems exist:

1. `/smartpos/setup` (SetupPage.tsx) — 3-step wizard gated by product count via `useSetupGate`. Blocks all routes until products exist.
2. Dashboard OnboardingBanner + SetupWizard — 5-step wizard tracked via `OnboardingContext` backend API. Auto-opens but never persists step completion.

These systems conflict: the product gate blocks routes unnecessarily, and the wizard doesn't actually mark steps as complete, leaving users stuck seeing onboarding prompts.

## Design

### Removals

- `src/views/smartpos/onboarding/SetupPage.tsx` — the product-gate wizard
- `src/routes/smartpos/useSetupGate.tsx` — product-count check hook
- `src/routes/Router.tsx` — `/smartpos/setup` route and `SetupPage` import
- `src/routes/smartpos/RequireAuth.tsx` — `SETUP_ALLOWED_ROUTES`, `useSetupGate` import, `needsSetup` redirect logic

### Unified flow

After signup, a new tenant lands on the dashboard. The `OnboardingBanner` shows a progress bar and context-aware CTA:

- 16% (workspace only) → "Start Setup" opens the full wizard
- 33-83% → direct links to the relevant page for the next incomplete step
- 100% → banner hides, celebration modal fires

### Wizard steps (4 steps, essential-only)

| # | Step | Why essential |
|---|------|---------------|
| 1 | Warehouse | Stock needs a location; pre-fill "Main Store" |
| 2 | Tax | Receipts need tax rules; pre-fill 18% VAT |
| 3 | Products | Can't sell without products; link to product import |
| 4 | First Sale | Auto-guide showing how to sell, with stock-up reminder |

Staff/Team invite is removed from the wizard (available in Settings → Users).

### First Sale step design

Two-part layout:

1. **Stock up first** (warning card) — reminds the user they need stock before selling. "Add Stock" button links to `/smartpos/purchases/new`.
2. **How to sell** (3-step read-only guide) — ① Open POS terminal, ② Add items to cart, ③ Accept payment & complete. "Open POS Terminal" button links to `/smartpos/pos`.

### Key behavior

- Wizard steps call `OnboardingContext.completeStep()` on actual completion (not on skip)
- "Skip" advances without marking complete — user can do it later
- Banner dismiss is one-click and persists via localStorage
- Wizard no longer auto-opens from DashboardPage (banner controls it)
- `RequireAuth` removes all onboarding gating — only auth/permission checks remain

## Files changed

| File | Action |
|------|--------|
| `SetupPage.tsx` | Delete |
| `useSetupGate.tsx` | Delete |
| `RequireAuth.tsx` | Remove setup gate, keep auth/permission checks |
| `Router.tsx` | Remove `/smartpos/setup` route and import |
| `SetupWizard.tsx` | Reduce to 4 steps, wire `completeStep` from OnboardingContext |
| `FirstSaleGuide.tsx` | Redesign with stock-up reminder and selling walkthrough |
| `DashboardPage.tsx` | Remove auto-open wizard `useEffect` |
| `OnboardingBanner.tsx` | Update step keys and paths to match 4-step wizard |
