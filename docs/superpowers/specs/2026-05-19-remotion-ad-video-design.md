# LetisPos — Remotion Advertising Video Design

## Summary

60-second vertical ad video (9:16, 1080×1920) built with Remotion for social media
(Instagram Reels, TikTok, YouTube Shorts). Targets East African SME owners with a
"stop losing track of your stock" hook, delivered in a clean tech aesthetic matching
the LetisPos brand.

## Audience & Platform

- **Primary audience**: East African SME owners (retail, wholesale)
- **Platforms**: Instagram Reels, TikTok, YouTube Shorts
- **Format**: Vertical 9:16, 1080×1920, 30fps
- **Tone**: Confident, modern, fast-paced but not frantic

## Visual Language

- **Background**: Dark base (#0F172A) consistent with the landing page dark theme
- **Accents**: Brand green (#16A34A) + blue (#3B82F6)
- **Typography**: Bold sans-serif, kinetic text with spring animations
- **Motion**: Spring-based transitions, smooth interpolations, no hard cuts
- **UI rendering**: Styled components (not screenshots) for clean, scalable motion graphics

## Scene Breakdown

### Scene 1 — Brand Open (0–5s, frames 0–149)

LetisPos logo animates in with a spring bounce. Tagline fades up:
"Smarter POS. Stronger Business." Subtle green glow pulse behind logo.

### Scene 2 — The Problem (5–12s, frames 150–359)

Abstract inventory chaos: numbers glitching, stock cards flipping, red warning flashes.
Text reveals in sequence: "Running out of stock?" / "Losing track of inventory?"
Ends on a moment of tension before the resolve.

### Scene 3 — Dashboard Reveal (12–22s, frames 360–659)

Full LetisPos dashboard builds up piece by piece. Widget cards slide in from edges.
Green status indicators pulse. KPI counters animate up from zero.
Text: "Everything. In one place."

### Scene 4 — Inventory Module (22–30s, frames 660–899)

Stock counters animate with number-easing. Warehouse cards slide in staggered.
Low-stock alert flashes orange then resolves to green as stock updates.
Text: "Real-time inventory. Zero guesswork."

### Scene 5 — Point of Sale (30–38s, frames 900–1139)

Checkout flow: items appear, barcode scan line sweeps, total calculates with slide-in.
Receipt prints (stylized animation). Customer display shows amount.
Text: "Fast checkout. Happy customers."

### Scene 6 — Reports & AI (38–46s, frames 1140–1379)

Bar chart draws in with staggered bar reveals. Line chart traces a growth curve.
AI insight cards pop up with glow: "Restock alert", "Top seller"
Text: "AI that knows before you do."

### Scene 7 — Cloud & Multi-store (46–52s, frames 1380–1559)

Map with location pins pulsing in sequence. Device mockups swap (phone → tablet → desktop).
Connection lines animate between locations and central hub.
Text: "Any branch. Any device."

### Scene 8 — CTA Close (52–60s, frames 1560–1799)

All elements converge into centered LetisPos logo. Scale + fade transition.
CTA text with spring: "Start free — 30 days on us"
Sub-text: letispos.com
"Launch offer: 50% off first 3 months" badge slides in.

## Project Structure

```
frontend/src/remotion/
├── Root.tsx                    # registerRoot + Composition registry
├── AdVideo.tsx                 # Main 60s composition — Sequences orchestrate scenes
├── config.ts                   # Shared constants (colors, durations, frame math)
├── scenes/
│   ├── BrandOpen.tsx           # 0-5s
│   ├── TheProblem.tsx          # 5-12s
│   ├── DashboardReveal.tsx     # 12-22s
│   ├── InventoryModule.tsx     # 22-30s
│   ├── PosModule.tsx           # 30-38s
│   ├── ReportsAI.tsx           # 38-46s
│   ├── CloudMultistore.tsx     # 46-52s
│   └── CtaClose.tsx            # 52-60s
├── components/
│   ├── KineticText.tsx         # Animated text with spring config
│   ├── SceneFrame.tsx          # Shared scene wrapper (background, padding, fade edges)
│   ├── UIDashboard.tsx         # Styled dashboard shell + widget grid
│   ├── UIChart.tsx             # Animated bar/line chart
│   ├── UICounter.tsx           # Eased number counter
│   ├── UIIconCard.tsx          # Icon + label card with hover-like animation
│   ├── UIStatusBadge.tsx       # Green/red/orange status indicator
│   └── GlowEffect.tsx          # Reusable glow ring / pulse effect
└── assets/
    └── (logo SVGs if needed as components)
```

Scenes live inside the main Remotion composition as `<Sequence>` components.
Nesting inside `frontend/src/` means it uses the existing React/MUI setup with no
dependency conflicts.

## Dependencies

- `remotion` — video framework
- `@remotion/cli` — dev studio + render CLI
- Existing: `react`, `typescript`, `@mui/material` (theme tokens only)

## Animation Conventions

- Entry: `spring()` with `{ damping: 15, stiffness: 80 }` for UI elements
- Text: `spring()` with `{ damping: 12, stiffness: 60 }` for kinetic typography
- Counters: `interpolate(frame, [start, end], [0, target], { extrapolateRight: 'clamp' })`
- Scene transitions: crossfade via opacity interpolation over 10 frames at boundaries
- Glow/pulse: `Math.sin(frame * 0.08) * 0.3 + 0.7` for subtle breathing effect

## Scope Boundaries

- **In scope**: All 8 scenes, reusable components, one Remotion composition
- **Out of scope**: Voiceover, music licensing, subtitles, localization, A/B variants,
  actual product screenshots (rendered UI components instead)

## Self-Review

- No placeholders or TBDs
- Scene durations sum to 60s exactly (5+7+10+8+8+8+6+8 = 60)
- Frame counts: 5*30=150, 7*30=210, 10*30=300, 8*30=240 each = consistent
- Visual language matches landing page (Hero.tsx dark theme tokens)
- Structure nested in existing frontend, no new repo needed
