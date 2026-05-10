# Landing Page Overlay Scrollbar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistent custom scrollbar on the landing page with an overlay scrollbar that appears only during scroll, floats above content, and fades out when idle.

**Architecture:** Two-file change — CSS scoped to `.lp-page` for the overlay scrollbar appearance, and a scroll event listener in `Landingpage.tsx` that toggles a `.scrolling` class with a 1.5s debounce for the fade-out behavior.

**Tech Stack:** React, CSS

---

### Task 1: Add overlay scrollbar CSS

**Files:**
- Modify: `frontend/src/views/pages/landingpage/Landingpage.css` (append after line 37)

- [ ] **Step 1: Append overlay scrollbar styles to Landingpage.css**

Add the following block at the end of `frontend/src/views/pages/landingpage/Landingpage.css`:

```css
/* ── Overlay scrollbar (floats above content, no layout shift) ──────────── */
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

/* Firefox fallback */
.lp-page {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.lp-page.scrolling {
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
```

- [ ] **Step 2: Verify CSS file is valid**

Run: `cat frontend/src/views/pages/landingpage/Landingpage.css | head -70`
Expected: CSS file has the new overlay scrollbar block at the end.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/landingpage/Landingpage.css
git commit -m "feat: add overlay scrollbar CSS for landing page"
```

---

### Task 2: Add scroll class toggle in Landingpage.tsx

**Files:**
- Modify: `frontend/src/views/pages/landingpage/Landingpage.tsx:1-104`

- [ ] **Step 1: Add useRef and useEffect imports**

Change line 1 from:
```tsx
import React from 'react';
```
to:
```tsx
import React, { useEffect, useRef } from 'react';
```

- [ ] **Step 2: Add scroll listener and ref inside the component**

Replace the start of the component body (line 20-21):
```tsx
const Landingpage: React.FC = () => {
  return (
```
with:
```tsx
const Landingpage: React.FC = () => {
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

  return (
```

- [ ] **Step 3: Attach ref to the root Box**

Change line 24 from:
```tsx
        <Box className="lp-page" sx={{ pb: { xs: 9, md: 0 } }}>
```
to:
```tsx
        <Box ref={pageRef} className="lp-page" sx={{ pb: { xs: 9, md: 0 } }}>
```

- [ ] **Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "Landingpage|error"`
Expected: No output (no errors in Landingpage.tsx)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/pages/landingpage/Landingpage.tsx
git commit -m "feat: add overlay scrollbar toggle on landing page"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the frontend dev server**

Run: `cd frontend && npm run dev`
Open: `http://localhost:5173/`

- [ ] **Step 2: Verify scrollbar behavior**

| Check | Expected |
|---|---|
| Page loads | No visible scrollbar on right edge |
| Scroll down | Thin (4px) semi-transparent white thumb fades in |
| Stop scrolling for 1.5s | Thumb fades out |
| Scroll again | Thumb fades back in |
| Content width | No layout shift (scrollbar doesn't push content) |

- [ ] **Step 3: Verify app pages unaffected**

Navigate to `/auth/login` or any non-landing page.
Expected: The standard 6px functional scrollbar is still present.
