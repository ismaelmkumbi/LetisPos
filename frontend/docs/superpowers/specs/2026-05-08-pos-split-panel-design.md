# Letis POS — True Split Panel Layout

## Context

The current CompactLayout uses a floating FAB → drawer cart pattern. On mobile the cart is a bottom drawer, on desktop a right drawer. The issue: the cart is always hidden. Cashiers must toggle to review the order, adding friction to the most frequent action. Products and cart never coexist on screen.

The goal: a true split-panel POS where the cart is always visible on desktop/tablet, and always accessible via a persistent bottom bar on mobile.

## Design Direction

**Refined Utility** — same aesthetic as the rest of the dashboard. Minimal chrome, maximum product density, cart always in view. Square POS / Shopify POS quality bar.

## Layout Structure

### Desktop / Tablet (≥ md breakpoint)

```
┌──────────────────────────────────────┬──────────────┐
│  Products Panel (flex: 1)            │  Cart Panel  │
│                                      │  (380px)     │
│  ┌─ Top bar ──────────────────────┐  │              │
│  │ [Warehouse ▼] [🔍 Search...] [📷]│  │  ─ Header   │
│  │ [☰ Filters]                    │  │  ─ Items    │
│  └────────────────────────────────┘  │  ─ Totals   │
│  ┌─ Tabs ─────────────────────────┐  │  ─ Pay btn  │
│  │ All ★Featured Best Low Recent  │  │              │
│  └────────────────────────────────┘  │              │
│  ┌─ Product Grid ─────────────────┐  │              │
│  │ [card] [card] [card] [card]    │  │              │
│  │ [card] [card] [card] [card]    │  │              │
│  │ [card] [card] [card] [card]    │  │              │
│  └────────────────────────────────┘  │              │
└──────────────────────────────────────┴──────────────┘
```

**Products Panel (left, flex: 1):**
- Top bar: warehouse selector + search input + barcode input + filters icon button — all in a single scrollable row
- Below: scrollable filter tabs (All, Featured, Bestsellers, Low Stock, Recent)
- Below: responsive product grid. 3 cols at lg, 4 at xl, 5 at xxl
- Filters (category, brand, register status) open via a slide-out or popover from the filters icon

**Cart Panel (right, 380px fixed):**
- Header: "Cart" title + item count badge + clear button
- Body: scrollable line item list. Each item shows: name, unit price × qty = total, +/- steppers, remove X
- Footer (sticky): subtotal, tax, discount (if applied), grand total, "Pay $X" button (full-width, green, prominent)

### Mobile (< md breakpoint)

```
┌──────────────────────────────┐
│  Products Panel (full width) │
│                              │
│  ┌─ Top bar ──────────────┐  │
│  │ [🏪▼] [🔍 Search...]   │  │
│  └────────────────────────┘  │
│  ┌─ Tabs ─────────────────┐  │
│  │ All ★ Best Low Recent  │  │
│  └────────────────────────┘  │
│  ┌─ Product Grid (2 cols) ─┐  │
│  │ [card] [card]           │  │
│  │ [card] [card]           │  │
│  │ [card] [card]           │  │
│  └─────────────────────────┘  │
├──────────────────────────────┤
│  Bottom Cart Bar (fixed)     │
│  3 items · $19.20  [CART ▸] │
└──────────────────────────────┘
```

**Mobile bottom bar (fixed, 56px + safe area):**
- Left: item count + total
- Right: "CART" or "VIEW CART" button that opens the cart as a bottom sheet (85dvh)
- Always visible — cart is never hidden
- On cart open, the bottom bar is hidden (cart footer replaces it)

**Cart panel on mobile:** bottom sheet at 85dvh with same structure as desktop cart

## Product Card Design

```
┌─────────────────┐
│      ┌───┐      │
│      │ M │      │  ← colored bg with initial letter
│      └───┘      │
│  [3 left]       │  ← stock badge (green/yellow/red)
│                 │
│  Milk 500ml     │  ← product name (bold, 1 line)
│  MLK-001  $2.40 │  ← code (optional) + price (green)
└─────────────────┘
```

- Aspect ratio: square on mobile, 4/3 on desktop
- Tap target: minimum 44×44dp touch area
- Active state: scale(0.97) + green tint background
- Out of stock: 45% opacity, not-allowed cursor
- Stock badge: top-left corner chip
  - Green: "47" (normal stock)
  - Yellow: "3 left" (low stock, ≤5)
  - Red: "Out of stock" (zero)

## Cart Line Item Design

Each line item:
- Full-width card with border
- Tap to edit (opens EditLineModal — existing component, unchanged)
- Quantity steppers: minus / count / plus buttons with 32×32px touch targets
- Remove button: X icon, 28×28px, red, positioned far right
- Shows: product name (bold), unit price × qty = line total
- Hover: subtle border color change to green

## Technical Constraints

- **Reuse existing business logic** — PosTerminalPage.tsx remains untouched. Only the layout component changes.
- **New component**: `SplitLayout.tsx` in `PosLayouts/`
- **Register in PosTerminalPage.tsx**: add 'split' to the layout map, make it the default
- **Keep existing layouts**: CompactLayout, ModernLayout, ClassicLayout, etc. all remain available
- **framer-motion**: Use for the cart panel open/close animation on mobile
- **All existing props**: SplitLayout must accept the same `PosLayoutProps` interface

## What We're NOT Doing

- Not changing PosTerminalPage.tsx business logic
- Not removing existing layouts
- Not changing the EditLineModal, PaymentSuccessOverlay, or any other shared POS component
- Not adding new API calls
- Not changing the receipt/printing flow
- Not changing the offline queue or cash register integration
