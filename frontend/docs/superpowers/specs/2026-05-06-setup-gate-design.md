# Setup Gate & Wizard — Design Spec

**Date:** 2026-05-06

## Goal

Prevent shop operation until at least one product exists. Walk new users through a setup wizard (Units → Products → Tax). Already-configured workspaces are unaffected.

## Gate Rule

- `useSetupGate()` fetches product count (searchProducts, size=1)
- If count === 0 → `needsSetup: true`
- RequireAuth redirects all routes to `/smartpos/setup` except: `/smartpos/setup`, `/smartpos/products/*`, `/smartpos/categories/*`, `/smartpos/units/*`, `/smartpos/settings/tax`

## Setup Page (`/smartpos/setup`)

Full-page 3-step wizard, not a dialog.

**Steps:**
1. **Units** — pre-seeded list (pieces, kg, liter, box, pack, bottle, can, dozen, pair). Review/add.
2. **Products** — add at least one product with inline category creation.
3. **Tax** — default rate, adjustable or skip.

**Layout:** Left sidebar (step list with status icons) + Right content area (active step). Progress bar at top. Each step has "Skip" and "Continue."

**Completion:** When productCount > 0, show completion screen with "Go to Dashboard" CTA.

## Pre-seeding Units

On registration success, create default units via API. If API unavailable, create client-side after login.

## Files

- `RequireAuth.tsx` — add useSetupGate check
- `SetupPage.tsx` — new full-page wizard at `/smartpos/setup`
- `SetupGate.tsx` — useSetupGate hook
- `OnboardingContext.tsx` — wire completeStep to persist
- `Router.tsx` — add /smartpos/setup route
- Seed units on registration
