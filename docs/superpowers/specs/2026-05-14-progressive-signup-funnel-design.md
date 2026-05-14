# Progressive Single-Funnel Signup — Design Spec

**Date:** 2026-05-14
**Status:** Approved
**Aesthetic:** Warm Brutalism (Newsreader + DM Sans, charcoal/gold/paper palette)

## Problem

The current registration flow asks users to choose a paid plan before they've seen any
product value. A 3-step wizard (Plan → Workspace → Admin) creates three drop-off
points. Mobile users skip the pricing section entirely via a direct "Start free" link.
The funnel serves two personas poorly: shop owners see prices before they hear "free
trial," and mid-market buyers can't evaluate features in a pre-signup wizard.

## Solution

Replace the 3-step registration wizard with a single-page quick signup. Users default to
a STARTER trial. Plan comparison and upgrades happen post-signup, when users feel
real constraints and have seen product value. The funnel becomes: **Landing → Quick
Signup → Verify → Welcome Dashboard → Upgrade in-app.**

---

## Section 1 — Funnel Architecture

### Before (current)

```
Landing → Register Step 1 (Plan) → Step 2 (Workspace) → Step 3 (Admin)
→ Verify → Dashboard (STARTER trial)
```

Problems:
- Plan choice asked before user has seen value
- 3 wizard steps = 3 drop-off opportunities
- Mobile "Start free" CTA skips pricing — user doesn't know what they're signing up for
- Shop owner sees TZS 15K before seeing "free trial"
- Mid-market buyer can't explore features in depth

### After (proposed)

```
Landing + Pricing → Quick Signup (1 page, ~30s) → Verify
→ Welcome Dashboard → Upgrade in-app when limits are felt
```

Wins:
- 1 page signup instead of 3 wizard steps — ~70% fewer drop-off points
- Plan choice deferred until user sees value (context-driven upsell)
- "30-day free trial · No credit card" communicated at signup
- Shop owner converts in under 60s; mid-market buyer explores plans post-signup
- Pricing page still exists for those who want to compare before signing up

---

## Section 2 — Quick Signup Page

### What it replaces
The 3-step wizard (`AuthRegister.tsx`): plan selection cards → workspace form → admin
account form.

### New design
Single-page form using the existing `LetisAuthLayout` structure but with updated
content and aesthetic.

**Left column (brand):**
- Warm Brutalism dark background (charcoal `#1a1a16` with grain texture)
- Gold vertical accent line on left edge
- Letis POS mark (gold/clay gradient square)
- Headline: "Run your store _with confidence._" (Newsreader serif, italic emphasis on last words)
- Three trust rows with icon boxes: 30-day trial, free local onboarding, M-Pesa payments
- Subtle plan chip: "You'll start on **Starter** — upgrade anytime"

**Right column (form):**
- Trial badge at top: pulsing green dot + "30-day free trial · No credit card"
- Fields: Business name, Workspace URL (auto-generated slug with `.letispos.app` helper), First name + Last name (side-by-side), Email, Password with strength bar (4 segments: clay → gold → green)
- Submit: "Start free trial →" — black button, subtle sheen overlay
- No Google SSO button (removed until OAuth is implemented)
- No channel toggle (email only; phone verification added post-MVP)
- Footer: "Already have an account? Sign in"

### What stays from current design
- Workspace slug auto-generation from business name
- All existing form fields
- Password visibility toggle
- LetisAuthLayout split-screen structure

### What changes
- No plan selection step — plan defaults to STARTER
- No phone channel toggle
- No Google SSO button
- Password strength meter added (CSS-only, 4 segments)
- Trust signals in left column replace the product mockup
- CTA copy: "Start free trial" replaces "Create account"

### Aesthetic (Warm Brutalism)
- Typography: Newsreader (serif, headlines) + DM Sans (sans-serif, UI)
- Colors: Charcoal ink `#1a1a16`, warm paper `#fafaf7`, gold `#c2843a`, clay `#c4724a`, deep green `#1b5e2f`
- Background: Subtle radial gradients + SVG noise texture on dark column
- Shadows: Minimal — `0 1px 2px + 0 4px 16px` cards, no heavy drop shadows
- Borders: 1px `#e6e4dd`, considered and restrained
- Motion: Staggered reveal animations (brand column 0.9s, form 0.7s with 0.15s delay)

### Backend changes
- No API changes required. `RegisterRequest` already accepts `billingPlan` as optional.
  Default remains STARTER on the backend when omitted.
- `BillingPlan.FREE` enum entry exists as legacy; new signups always get STARTER.

---

## Section 3 — Welcome Dashboard (Post-Verification)

### What it replaces
The generic "Verification Sent" dead-end screen and the standalone trial Alert banner.

### New design
Layers on top of the existing `DashboardPage.tsx` and `OnboardingBanner.tsx` — no new
page, just a smarter first-login state.

**Welcome card (replaces separate trial Alert + OnboardingBanner):**
- Full-width dark card (charcoal `#1a1a16` with grain + radial gradient overlays)
- "Your workspace is ready" — gold uppercase label
- "Welcome, [First Name]" — Newsreader headline
- Three numbered setup steps: Warehouse → Add products → First sale
  (completed = green check, current = gold ring with pulse, pending = muted)
- "Start guided setup" button (gold `#c2843a`, triggers existing SetupWizard)
- Side stat boxes: plan name + trial days remaining (translucent white cards on dark bg)

**Dashboard grid (empty state):**
- Three dashed-border placeholder cards: Today's sales, Inventory overview, Cash in hand
- Each shows icon + human message ("Data appears after your first sale")
- Regular dashboard KPIs/charts render below with zero values until data exists

**Plan upsell link (subtle, bottom):**
- "Need more features? Compare plans and upgrade →"
- Low-opacity text, only noticeable if user is looking for it

### Existing components we build on
- `OnboardingBanner` — already tracks progress (workspace, warehouse, tax, products, firstSale)
- `SetupWizard` — modal wizard triggered when progress ≤ 20%
- `CelebrationModal` — fires when onboarding completes
- `DashboardPage.trialBanner` — Alert component; merged into welcome card
- `AuthContext.isTrialing()` / `getTrialDaysLeft()` — already available

### Backend changes
- None. Onboarding state is already tracked via `OnboardingContext`.

---

## Section 4 — In-App Upgrade Path

Three triggers, escalating in intrusiveness. Never interrupts the user during a task.

### Trigger 1: PlanGate lock screen (existing, refined)
- When user navigates to a gated route (e.g., `/smartpos/accounting/chart-of-accounts`)
- Shows lock icon, feature name, required plan, two CTAs: "Upgrade to X — TZS Y/mo" + "Compare all plans"
- Adds trial note: "Still in your 30-day trial. You won't be charged until it ends."
- Already implemented in `PlanGate.tsx` — change: add trial note text, refine visual styling

### Trigger 2: Limit toast (NEW)
- When user hits a plan limit (users, stores, products):
  - **Hard limit reached** (e.g., 2/2 users): Warning toast (gold background), "User limit reached", CTA: "Upgrade →"
  - **Limit approached** (e.g., 1/1 store, user adds second location): Info toast (blue), "Adding a second location?", CTA: "See plans →"
- Rendered as in-page dismissible cards, not modal toasts
- Dismissed per-session, re-shown on next relevant action
- Implementation: new `LimitGate` component or hook, checked on user-invite flow, warehouse creation, product import

### Trigger 3: Trial expiry nudge (existing, refined timing)
- **Days 1–21:** No urgency messaging. Let user build value.
- **Days 22–27:** Gentle dashboard banner. "7 days left — subscribe to keep access." No modal.
- **Days 28–30:** Urgent dashboard banner. "2 days left — subscribe now to avoid interruption."
- Existing trial Alert in `DashboardPage.tsx` already shows trial days. Change: add tiered messaging logic, remove from days 1-21.

### What we refuse to build
- No popup modals on login demanding upgrade decision
- No features that work temporarily then vanish mid-use
- No countdown timers on POS terminal or product editor
- No fake scarcity ("Only 2 spots at this price!")

### Existing components we build on
- `TenantBillingPage` — full self-service: current plan, usage, invoices, M-Pesa, upgrade/cancel dialogs
- `PlanGate` — route-level gating with lock screen and "Upgrade Plan" CTA
- `AuthContext.hasPlan()` — runtime plan check
- `PLAN_LEVEL` mapping — STARTER=1, BUSINESS=2, PROFESSIONAL=3, ENTERPRISE=4

---

## Visual System — Warm Brutalism

### Typography
- **Display/Headlines:** Newsreader (Google Fonts), serif, weights 400–600, letter-spacing -0.015em
- **UI/Body:** DM Sans (Google Fonts), sans-serif, weights 400–700
- Fallback stack: Georgia for serif, -apple-system for sans

### Color palette
| Role | Hex | Usage |
|------|-----|-------|
| Ink | `#1a1a16` | Primary text, dark backgrounds, buttons |
| Ink Light | `#3d3d36` | Secondary text |
| Paper | `#fafaf7` | Page background, light surfaces |
| Paper Muted | `#f3f2ee` | Dashed cards, hover states |
| Warm Gold | `#c2843a` | Accent, CTAs, brand mark, trial labels |
| Gold Light | `#f5e6d3` | Warning toasts, subtle highlights |
| Clay | `#c4724a` | Secondary accent, strength bar low |
| Clay Light | `#faf0e9` | Soft warm backgrounds |
| Green | `#1b5e2f` | Success, brand green, links |
| Green Light | `#e8f5e9` | Trial badges, success toasts |
| Border | `#e6e4dd` | Default borders |
| Border Strong | `#d4d2ca` | Hover/active borders |

### Texture & backgrounds
- Dark surfaces: SVG noise filter overlay at 3-4% opacity + radial gold/green gradients
- Light surfaces: Subtle radial clay/green gradients at 2-4% opacity
- No flat solid colors on large surfaces

### Shadows
- Cards: `0 1px 2px rgba(26,26,22,0.04), 0 4px 16px rgba(26,26,22,0.06)`
- Elevated: `0 1px 2px rgba(26,26,22,0.05), 0 8px 32px rgba(26,26,22,0.09)`
- No heavy drop shadows. Restrained depth.

### Motion
- Page load: Staggered fade-up reveals (0.7-0.9s, cubic-bezier(0.16, 1, 0.3, 1))
- Hover: Subtle translateY(-1px) + shadow increase, 0.2s ease
- No bounce, no spring, no over-animation

### Borders
- 1px solid, `#e6e4dd` default
- Radius scale: sm=6px, md=10px, lg=18px, xl=24px

---

## Implementation Notes

### What we modify

| File | Change |
|------|--------|
| `AuthRegister.tsx` | Replace 3-step wizard with single-page form |
| `LetisAuthLayout.tsx` | Update left-column content, adopt Warm Brutalism theme |
| `AuthLoginForm.tsx` | Remove Google SSO button, match new aesthetic |
| `OnboardingBanner.tsx` | Enhance to show numbered steps + richer first-login state |
| `DashboardPage.tsx` | Merge trial banner into welcome card, add empty states, tiered trial messaging |
| `PlanGate.tsx` | Add trial note to lock screen |

### What we add

| File | Purpose |
|------|---------|
| `LimitGate.tsx` (or hook) | Detect plan limit reached/approached, render limit toasts |
| Theme tokens/styles | CSS variables or MUI theme extension for Warm Brutalism palette |

### What we remove

| Item | Reason |
|------|--------|
| Google SSO button in `AuthLoginForm` | Non-functional, misleading |
| Channel toggle in `AuthRegister` | Phone verification deferred to post-MVP |
| Plan selection cards in `AuthRegister` | Moved to post-signup experience |

### What stays untouched
- Backend auth endpoints (`/register`, `/login`, `/verify`)
- Billing service (plans, subscriptions, invoices)
- `TenantBillingPage` (self-service upgrade page)
- `SetupWizard` and `CelebrationModal`
- `OnboardingContext` and `AuthContext`
- All route definitions and `PlanGate` wrappers
- Landing page (pricing section continues to work as-is)

---

## Out of Scope
- Google OAuth implementation (removed button, not building the feature)
- Phone/SMS verification channel
- Annual billing option during signup
- Post-registration email automation changes
- Landing page redesign (the landing page stays as-is; only the signup page it links to changes)
- M-Pesa integration changes
