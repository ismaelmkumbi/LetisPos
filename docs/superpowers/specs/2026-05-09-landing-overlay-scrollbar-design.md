# Landing Page Overlay Scrollbar

**Date:** 2026-05-09
**Status:** approved

## Goal

Replace the persistent custom scrollbar on the landing page with an overlay scrollbar that appears only during scroll, floats above content without taking layout space, and fades out when idle.

## Why

The landing page has a dark background (`#0F172A`). A persistent 6px scrollbar track/thumb (from global `index.css` and MUI `CssBaseline` styles) sits on the right edge as a visible line, cheapening the immersive dark aesthetic. Premium landing pages (Stripe, Linear, Vercel) use overlay scrollbars that feel app-like, not browser-like.

## Scope

- Landing page only (`.lp-page` scoped in `Landingpage.css`)
- Does not change global scrollbar styles
- Add scroll class toggle in `Landingpage.tsx`

## Behavior

| State | Appearance |
|---|---|
| Idle (no scroll for ~1.5s) | Scrollbar thumb invisible (opacity 0) |
| Scrolling | Thin (4px) semi-transparent white thumb fades in |
| Hover over thumb | Opacity increases slightly for affordance |
| Scroll + idle timeout | Fades back out over 0.4s |

## Implementation

### 1. CSS — `frontend/src/views/pages/landingpage/Landingpage.css`

Add scoped overlay scrollbar styles:

```css
.lp-page {
  overflow-y: overlay;
}

.lp-page::-webkit-scrollbar {
  width: 4px;
}

.lp-page::-webkit-scrollbar-track {
  background: transparent;
}

.lp-page::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 99px;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.lp-page::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* Show thumb only while actively scrolling */
.lp-page.scrolling::-webkit-scrollbar-thumb {
  opacity: 1;
}
```

Firefox fallback (only scrollbar-width/color properties supported):

```css
.lp-page {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.lp-page.scrolling {
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
```

Note: `overflow-y: overlay` is deprecated in modern Chrome but still works and falls back to `auto` gracefully. The key is that `overlay` doesn't take layout space. If it stops working, the 4px width is narrow enough to be unobtrusive.

### 2. Scroll class toggle — `Landingpage.tsx`

Add a `useEffect` that toggles the `.scrolling` class on the landing page container:

```tsx
// In Landingpage component
const pageRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  let timer: ReturnType<typeof setTimeout>;
  const onScroll = () => {
    pageRef.current?.classList.add('scrolling');
    clearTimeout(timer);
    timer = setTimeout(() => {
      pageRef.current?.classList.remove('scrolling');
    }, 1500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    clearTimeout(timer);
  };
}, []);
```

Attach `ref={pageRef}` to the root `<Box className="lp-page">`.

### 3. Also remove conflicting global scrollbar on landing page

The global `::-webkit-scrollbar` rules in `index.css` and MUI `CssBaseline` will still apply. Add a reset inside `.lp-page` to override them:

```css
/* Override global scrollbar styles for landing page */
.lp-page::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.lp-page::-webkit-scrollbar-track {
  background: transparent;
}
.lp-page::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 99px;
}
```

(This is already covered by the styles above — the scoped selector `.lp-page::-webkit-scrollbar` will override the global `::-webkit-scrollbar` because it's more specific.)

## What stays unchanged

- Global scrollbar styles in `index.css` and `Components.tsx` — the app sidebar, settings pages, etc. keep their functional scrollbars
- Header scroll listener in `Header.tsx` — independent, keeps working
- `scroll-behavior: smooth` — unaffected

## Testing

- [ ] Landing page: scrollbar invisible when idle
- [ ] Landing page: thumb fades in during scroll
- [ ] Landing page: thumb fades out ~1.5s after scroll stops
- [ ] Landing page: content width does not shift (no layout reflow)
- [ ] Dark mode: thumb visible against dark background
- [ ] App pages (dashboard, settings, POS): global scrollbar still works
- [ ] Firefox: thin scrollbar with correct colors
- [ ] Mobile: no regressions (mobile browsers handle overlay scrollbars natively)
