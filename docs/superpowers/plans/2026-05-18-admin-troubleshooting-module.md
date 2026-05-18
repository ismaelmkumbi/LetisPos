# Admin Troubleshooting Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Troubleshooting page under Admin with operation cards — first card runs the WAC backfill.

**Architecture:** Frontend-only. One new page with a card grid, one new sidebar item under Administration, one new route. The WAC backfill API (`POST /api/v1/sales/backfill-wac`) already exists in sales-service.

**Tech Stack:** React, TypeScript, MUI v6, react-router v7

---

## File Map

| File | Action |
|---|---|
| `frontend/src/api/smartpos/admin.ts` | Create |
| `frontend/src/views/smartpos/admin/TroubleshootingPage.tsx` | Create |
| `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts` | Modify |
| `frontend/src/routes/Router.tsx` | Modify |

---

### Task 1: Create the API function

**Files:**
- Create: `frontend/src/api/smartpos/admin.ts`

- [ ] **Step 1: Create admin API module**

```typescript
import { api } from './client';

export async function runWacBackfill(): Promise<{ updated: number; costsFound: number; message?: string }> {
  const { data } = await api.post('/api/v1/sales/backfill-wac');
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/admin.ts
git commit -m "feat: add admin API module with WAC backfill call"
```

---

### Task 2: Create the TroubleshootingPage component

**Files:**
- Create: `frontend/src/views/smartpos/admin/TroubleshootingPage.tsx`

- [ ] **Step 1: Write the page component**

```tsx
import { useState, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, Alert, Chip, Stack, CircularProgress,
} from '@mui/material';
import { IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { runWacBackfill } from 'src/api/smartpos/admin';
import PageHeader from 'src/components/shared/PageHeader';

type OpState = 'idle' | 'running' | 'success' | 'error';

interface OpResult {
  state: OpState;
  message: string;
  lastRun: string | null;
}

const initialResult: OpResult = { state: 'idle', message: '', lastRun: null };

export default function TroubleshootingPage() {
  const [wacResult, setWacResult] = useState<OpResult>(initialResult);

  const handleWacBackfill = useCallback(async () => {
    setWacResult({ state: 'running', message: '', lastRun: null });
    try {
      const res = await runWacBackfill();
      const now = new Date().toLocaleString();
      if (res.updated > 0) {
        setWacResult({
          state: 'success',
          message: `Updated ${res.updated} stock records with purchase costs (${res.costsFound} cost entries found).`,
          lastRun: now,
        });
      } else if (res.costsFound === 0) {
        setWacResult({
          state: 'success',
          message: 'No purchase data found for this tenant. Stock must be received via purchase orders first.',
          lastRun: now,
        });
      } else {
        setWacResult({
          state: 'success',
          message: 'All stock costs are already up to date. No changes needed.',
          lastRun: now,
        });
      }
    } catch (e: any) {
      setWacResult({
        state: 'error',
        message: e?.response?.data?.message || e?.message || 'Backfill failed. Check server logs.',
        lastRun: null,
      });
    }
  }, []);

  const operations = [
    {
      title: 'Recalculate Product Costs',
      icon: <IconRefresh size={24} />,
      description:
        'Seeds weighted average cost for existing stock from the most recent purchase costs. Run this if products are showing 0% or 100% margins on the Business Pulse card.',
      result: wacResult,
      onRun: handleWacBackfill,
    },
  ];

  const resultAlert = (result: OpResult) => {
    if (result.state === 'running') return null;
    if (result.state === 'idle') return null;
    return (
      <Alert
        severity={result.state === 'error' ? 'error' : 'success'}
        icon={result.state === 'error' ? <IconAlertCircle /> : <IconCheck />}
        sx={{ mt: 1.5 }}
      >
        <Typography variant="body2">{result.message}</Typography>
        {result.lastRun && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Last run: {result.lastRun}
          </Typography>
        )}
      </Alert>
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader title="Troubleshooting" subtitle="Administrative operations and data repairs" />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {operations.map((op) => (
          <Grid size={{ xs: 12, md: 6 }} key={op.title}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box sx={{ color: 'primary.main', mt: 0.3 }}>{op.icon}</Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} fontSize={16}>
                      {op.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {op.description}
                    </Typography>
                  </Box>
                </Stack>
                {resultAlert(op.result)}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  variant="contained"
                  color={op.result.state === 'error' ? 'error' : 'primary'}
                  disabled={op.result.state === 'running'}
                  onClick={op.onRun}
                  startIcon={op.result.state === 'running' ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {op.result.state === 'running' ? 'Running…' : 'Run'}
                </Button>
                {op.result.state === 'idle' && (
                  <Chip label="Ready" size="small" color="default" variant="outlined" sx={{ ml: 1 }} />
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/admin/TroubleshootingPage.tsx
git commit -m "feat: add admin Troubleshooting page with WAC backfill card"
```

---

### Task 3: Add sidebar menu item

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`

- [ ] **Step 1: Add Troubleshooting item after Backups**

In `SmartPosMenuItems.ts`, after line 277 (the "Backups" item), insert:

```typescript
{ id: uid(), title: 'Troubleshooting', icon: IconBuild, href: '/smartpos/admin/troubleshooting' },
```

The `IconBuild` icon needs to be imported at the top. Search the file for the nearest icon import (likely from `@tabler/icons-react`). Add `IconBuild` to that import statement.

The existing import line looks like:
```typescript
import { IconDownload, IconBug, IconKey, ... } from '@tabler/icons-react';
```
Add `IconBuild` to this list.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: add Troubleshooting to admin sidebar menu"
```

---

### Task 4: Register route in Router

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add lazy-loaded import for TroubleshootingPage**

In the imports section (around lines 130-145, where other admin pages are imported), add after the Backups import on line 143:

```typescript
const SmartPosTroubleshooting = Loadable(lazy(() => import('../views/smartpos/admin/TroubleshootingPage')));
```

- [ ] **Step 2: Add the route**

After line 695 (the `admin/backups` route), add:

```tsx
{ path: 'admin/troubleshooting', element: <RequireAuth><RequireAdmin><SmartPosTroubleshooting /></RequireAdmin></RequireAuth> },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: register admin troubleshooting route"
```

---

### Task 5: Verify frontend builds

- [ ] **Step 1: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 2: Commit any build fixes**

```bash
git add -A && git commit -m "chore: build fixes for troubleshooting module" || echo "no fixes needed"
```
