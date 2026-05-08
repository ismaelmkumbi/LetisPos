# Insights Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Reports module into an AI-first Insights Hub with integrated Executive Summaries and Smart Insights on every report, plus a redesigned hub landing page.

**Architecture:** Three new shared components (BusinessPulseCard, ExecutiveSummary, SmartInsights) replace the existing collapsible AI cards. Two existing shared components (ReportKpiRow, ReportChartCard) get responsive upgrades. The ReportsHubPage is redesigned as the Insights Hub landing. Three key report pages (Sales, Profit & Loss, Inventory) are redesigned with integrated AI panels as the pattern example. All remaining report pages inherit the shared component upgrades.

**Tech Stack:** React 19 + TypeScript, MUI 7, ApexCharts, existing AI API functions (`aiNarrate`, `aiGetRecommendations`)

---

## File Map

```
Create:
  frontend/src/components/smartpos/reports/BusinessPulseCard.tsx
  frontend/src/components/smartpos/reports/ExecutiveSummary.tsx
  frontend/src/components/smartpos/reports/SmartInsights.tsx

Modify:
  frontend/src/components/smartpos/reports/AiReportSummary.tsx       — keep, re-export from ExecutiveSummary
  frontend/src/components/smartpos/reports/AiRecommendations.tsx     — keep, re-export from SmartInsights
  frontend/src/components/smartpos/reports/ReportKpiRow.tsx          — responsive upgrade
  frontend/src/components/smartpos/reports/ReportChartCard.tsx       — add chartType config
  frontend/src/components/smartpos/reports/index.ts                  — add new exports
  frontend/src/views/smartpos/reports/ReportsHubPage.tsx             — redesign as Insights Hub
  frontend/src/views/smartpos/reports/SalesReportPage.tsx            — integrated AI pattern
  frontend/src/views/smartpos/reports/ProfitLossPage.tsx             — integrated AI pattern
  frontend/src/views/smartpos/reports/InventoryReportPage.tsx        — integrated AI pattern
```

---

### Task 1: BusinessPulseCard — Cross-Report AI Summary for Hub

**Files:**
- Create: `frontend/src/components/smartpos/reports/BusinessPulseCard.tsx`

- [ ] **Step 1: Write BusinessPulseCard component**

```typescript
import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Skeleton, Stack, Typography, Chip } from '@mui/material';
import { IconSparkles, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { aiNarrate, type InsightResponse } from 'src/api/smartpos/ai';
import { getDashboard } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

interface PulseLink {
  label: string;
  to: string;
}

export default function BusinessPulseCard() {
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [links, setLinks] = useState<PulseLink[]>([]);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const dash = await getDashboard({ period: 'MONTH' });
        if (cancelled) return;
        const facts = {
          grossSales: dash.sales.gross,
          netSales: dash.sales.net,
          orderCount: dash.sales.count,
          lowStock: dash.inventory.lowStockLines,
          netProfit: dash.netProfit,
          expenses: dash.expenses.total,
          period: 'this month',
        };
        const result = await aiNarrate({
          reportKind: 'BUSINESS_PULSE',
          factsJson: JSON.stringify(facts),
        });
        if (cancelled) return;
        setNarrative(result.narrative);
        setLinks([
          { label: 'View Sales Report', to: '/smartpos/reports/sales' },
          { label: 'View Profit & Loss', to: '/smartpos/reports/profit-loss' },
        ]);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) return null;

  return (
    <Card elevation={0} sx={{ borderRadius: '16px', background: `linear-gradient(135deg, #0F172A 0%, #14532D 100%)`, color: '#fff', mb: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Chip label="LIVE" size="small" icon={<IconSparkles size={12} />}
            sx={{ bgcolor: brand.primary[500], color: '#fff', fontWeight: 800, fontSize: '0.65rem', height: 22, borderRadius: '6px', '& .MuiChip-icon': { color: '#fff', ml: 0.5 } }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', opacity: 0.8 }}>Business Pulse · This Month</Typography>
        </Stack>
        {loading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
            <Skeleton variant="text" width="80%" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
            <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
          </Stack>
        ) : (
          <>
            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.92, mb: 2 }}>
              {narrative}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
              {links.map((link) => (
                <Chip key={link.to} label={link.label} onClick={() => navigate(link.to)}
                  onDelete={() => navigate(link.to)} deleteIcon={<IconArrowRight size={14} />}
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: '0.7rem', borderRadius: '6px', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, '& .MuiChip-deleteIcon': { color: brand.primary[300] } }} />
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/reports/BusinessPulseCard.tsx
git commit -m "feat: add BusinessPulseCard — cross-report AI summary for Insights Hub

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ExecutiveSummary — Inline AI Narrative Strip

**Files:**
- Create: `frontend/src/components/smartpos/reports/ExecutiveSummary.tsx`

- [ ] **Step 1: Write ExecutiveSummary component**

```typescript
import { useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Skeleton, Stack, Typography, Chip } from '@mui/material';
import { IconSparkles, IconRefresh } from '@tabler/icons-react';
import { aiNarrate, type InsightResponse } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
  /** Cache key — when it changes (e.g., period), regenerate */
  cacheKey?: string;
}

export default function ExecutiveSummary({ reportKind, factsJson, cacheKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiNarrate({ reportKind, factsJson });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${brand.error.light}`, borderRadius: '12px', mb: 2 }}>
        <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ color: brand.error.main, fontSize: 13 }}>{error}</Typography>
          <Button size="small" onClick={handleGenerate} startIcon={<IconRefresh size={14} />}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          {loading ? (
            <Stack spacing={1}>
              <Skeleton variant="text" width="90%" />
              <Skeleton variant="text" width="75%" />
              <Skeleton variant="text" width="60%" />
            </Stack>
          ) : (
            <Button fullWidth variant="outlined" onClick={handleGenerate}
              startIcon={<IconSparkles size={16} />}
              sx={{ borderColor: brand.accent[300], color: brand.accent[600], fontWeight: 700, borderRadius: '10px', py: 1.5 }}>
              Generate Executive Summary
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.primary[200]}`, borderRadius: '12px', mb: 2, background: `linear-gradient(135deg, ${brand.primary[50]} 0%, #fff 100%)` }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <IconSparkles size={16} color={brand.primary[600]} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: brand.primary[700] }}>Executive Summary</Typography>
          <Chip label="AI" size="small" sx={{ bgcolor: brand.primary[100], color: brand.primary[700], fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '6px' }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={handleGenerate} startIcon={loading ? <CircularProgress size={12} /> : <IconRefresh size={12} />}
            sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: brand.neutral[500], '&:hover': { color: brand.primary[600] } }}>
            {loading ? 'Refreshing…' : 'Regenerate'}
          </Button>
        </Stack>
        <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.75, color: brand.neutral[800] }}>
          {result.narrative}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: brand.neutral[400], mt: 1 }}>
          Generated just now
        </Typography>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/reports/ExecutiveSummary.tsx
git commit -m "feat: add ExecutiveSummary — inline AI narrative strip for reports"
```

---

### Task 3: SmartInsights — Actionable AI Recommendations Grid

**Files:**
- Create: `frontend/src/components/smartpos/reports/SmartInsights.tsx`

- [ ] **Step 1: Write SmartInsights component**

```typescript
import { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { IconBulb } from '@tabler/icons-react';
import { aiGetRecommendations, type Recommendation } from 'src/api/smartpos/ai';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKind: string;
  factsJson: string;
  cacheKey?: string;
}

const priorityColors: Record<string, { bg: string; color: string; border: string }> = {
  HIGH: { bg: brand.error.light, color: brand.error.dark, border: brand.error.main },
  MEDIUM: { bg: brand.warning.light, color: brand.warning.dark, border: brand.warning.main },
  LOW: { bg: brand.success.light, color: brand.success.dark, border: brand.success.main },
};

const categoryColors: Record<string, string> = {
  INVENTORY: brand.info.main, PRICING: brand.accent[500], SALES: brand.primary[600],
  COST: brand.error.main, GENERAL: brand.neutral[600],
};

export default function SmartInsights({ reportKind, factsJson, cacheKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiGetRecommendations(reportKind, factsJson);
      setRecs(r.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1.5 }}>Smart Insights</Typography>
        <Grid container spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: '10px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (recs.length === 0 && !error) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Button fullWidth variant="outlined" onClick={handleGenerate}
            startIcon={<IconBulb size={16} />}
            sx={{ borderColor: brand.warning.main, color: brand.warning.main, fontWeight: 700, borderRadius: '10px', py: 1.5 }}>
            Generate Smart Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconBulb size={16} color={brand.warning.main} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Smart Insights</Typography>
          <Chip label={`${recs.length} actions`} size="small"
            sx={{ bgcolor: brand.warning.light, color: brand.warning.dark, fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '6px' }} />
        </Stack>
        <Button size="small" onClick={handleGenerate}
          sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: brand.neutral[500] }}>
          Refresh
        </Button>
      </Stack>

      {error && <Typography sx={{ color: brand.error.main, fontSize: 12, mb: 1 }}>{error}</Typography>}

      <Grid container spacing={1.5}>
        {recs.map((rec, i) => {
          const p = priorityColors[rec.priority] || priorityColors.MEDIUM;
          return (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderLeft: `3px solid ${p.border}`, borderRadius: '10px', height: '100%', bgcolor: p.bg, transition: 'transform 0.12s ease', '&:hover': { transform: 'translateY(-1px)' } }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                    <Chip label={rec.priority} size="small"
                      sx={{ bgcolor: `${p.color}22`, color: p.color, fontWeight: 800, fontSize: '0.6rem', height: 18, borderRadius: '4px' }} />
                    <Chip label={rec.category} size="small"
                      sx={{ bgcolor: `${categoryColors[rec.category] || brand.neutral[600]}18`, color: categoryColors[rec.category] || brand.neutral[600], fontWeight: 700, fontSize: '0.6rem', height: 18, borderRadius: '4px' }} />
                  </Stack>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.5 }}>{rec.title}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: brand.neutral[600], lineHeight: 1.5 }}>{rec.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/reports/SmartInsights.tsx
git commit -m "feat: add SmartInsights — actionable AI recommendation cards"
```

---

### Task 4: Upgrade ReportKpiRow — Responsive KPI Cards

**Files:**
- Read: `frontend/src/components/smartpos/reports/ReportKpiRow.tsx`
- Modify: `frontend/src/components/smartpos/reports/ReportKpiRow.tsx`

- [ ] **Step 1: Read the current component, then update it**

Read the file first. Then wrap the KPI grid in a scrollable container on mobile:

Replace the Grid container's sx to add:
```typescript
sx={{
  mx: { xs: -1.5, sm: 0 },
  px: { xs: 1.5, sm: 0 },
  overflow: { xs: 'auto', md: 'visible' },
  WebkitOverflowScrolling: 'touch',
  scrollSnapType: { xs: 'x mandatory', md: 'none' },
  '&::-webkit-scrollbar': { display: 'none' },
  scrollbarWidth: 'none',
}}
```

Add `flexWrap: { xs: 'nowrap', md: 'wrap' }` and `minWidth: { xs: 160, md: 'auto' }` + `scrollSnapAlign: 'start'` to each KPI card Grid item.

- [ ] **Step 2: Verify compilation and commit**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10
git add frontend/src/components/smartpos/reports/ReportKpiRow.tsx
git commit -m "feat: make ReportKpiRow horizontally scrollable on mobile"
```

---

### Task 5: Redesign ReportsHubPage → Insights Hub

**Files:**
- Modify: `frontend/src/views/smartpos/reports/ReportsHubPage.tsx`

- [ ] **Step 1: Rewrite ReportsHubPage as Insights Hub**

Replace the entire component content. Keep existing imports. Add BusinessPulseCard import. The new hub layout:

```typescript
import { Box, Card, CardActionArea, CardContent, Grid, Typography, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { /* existing icons */ } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import BusinessPulseCard from 'src/components/smartpos/reports/BusinessPulseCard';
import { brand } from 'src/theme/smartpos/brand';

const REPORTS = [ /* same 9 items, unchanged */ ];

export default function ReportsHubPage() {
  return (
    <Box>
      <PageHeader title="Insights" subtitle="AI-powered analysis from your business data" />

      {/* Business Pulse — cross-report AI summary */}
      <BusinessPulseCard />

      {/* Priority actions placeholder — filled by individual report insights */}
      <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 1.5, mt: 3 }}>Explore Reports</Typography>

      <Grid container spacing={2}>
        {REPORTS.map((r) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.to}>
            <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%', transition: 'transform 0.15s ease, box-shadow 0.15s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' } }}>
              <CardActionArea component={RouterLink} to={r.to} sx={{ height: '100%', p: 0 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: r.soft, color: r.color, display: 'grid', placeItems: 'center', mb: 1.5 }}>
                    <r.icon size={22} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: brand.neutral[900], mb: 0.5 }}>{r.title}</Typography>
                  <Typography sx={{ color: brand.neutral[500], fontSize: 13, lineHeight: 1.4 }}>{r.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Verify compilation and commit**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10
git add frontend/src/views/smartpos/reports/ReportsHubPage.tsx
git commit -m "feat: redesign Reports page as Insights Hub with Business Pulse card"
```

---

### Task 6: Redesign SalesReportPage with Integrated AI

**Files:**
- Modify: `frontend/src/views/smartpos/reports/SalesReportPage.tsx`

- [ ] **Step 1: Read the current file, then add ExecutiveSummary + SmartInsights**

The current file imports AiReportSummary and AiRecommendations. Replace those imports with ExecutiveSummary and SmartInsights. Place ExecutiveSummary right after the KPI row (before charts). Place SmartInsights after the charts (before the data table).

Key insert in the JSX (after KPI row, before charts):
```typescript
{/* Executive Summary */}
<ExecutiveSummary
  reportKind="SALES"
  factsJson={JSON.stringify({
    gross: sales?.gross, net: sales?.net, tax: sales?.tax,
    discount: sales?.discount, orders: sales?.count,
    avgSale: sales?.avgSale, paid: sales?.paid, due: sales?.due,
    period: `${filters.dateFrom} to ${filters.dateTo}`,
  })}
  cacheKey={`${filters.dateFrom}-${filters.dateTo}-${filters.warehouseId}`}
/>
```

And after the charts section, before the data tables:
```typescript
{/* Smart Insights */}
<SmartInsights
  reportKind="SALES"
  factsJson={JSON.stringify({
    gross: sales?.gross, net: sales?.net, tax: sales?.tax,
    topCategory: byDimension?.rows?.[0]?.name,
    topProduct: topProducts?.[0]?.productName,
    orderCount: sales?.count,
  })}
  cacheKey={`${filters.dateFrom}-${filters.dateTo}`}
/>
```

- [ ] **Step 2: Verify compilation and commit**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10
git add frontend/src/views/smartpos/reports/SalesReportPage.tsx
git commit -m "feat: integrate Executive Summary and Smart Insights into Sales Report"
```

---

### Task 7: Redesign ProfitLossPage with Integrated AI

**Files:**
- Modify: `frontend/src/views/smartpos/reports/ProfitLossPage.tsx`

- [ ] **Step 1: Add ExecutiveSummary + SmartInsights to ProfitLossPage**

Same pattern as SalesReportPage. Read the file, add imports, insert ExecutiveSummary after KPIs, SmartInsights after charts. Use `reportKind="PROFIT_LOSS"` and include relevant facts (revenue, cogs, grossProfit, expenses, netProfit, margin).

- [ ] **Step 2: Verify compilation and commit**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10
git add frontend/src/views/smartpos/reports/ProfitLossPage.tsx
git commit -m "feat: integrate Executive Summary and Smart Insights into P&L Report"
```

---

### Task 8: Redesign InventoryReportPage with Integrated AI

**Files:**
- Modify: `frontend/src/views/smartpos/reports/InventoryReportPage.tsx`

- [ ] **Step 1: Add ExecutiveSummary + SmartInsights to InventoryReportPage**

Same pattern. `reportKind="INVENTORY"` with facts: totalSku, totalOnHand, lowStock, totalValue, warehouseCount.

- [ ] **Step 2: Verify compilation and commit**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | head -10
git add frontend/src/views/smartpos/reports/InventoryReportPage.tsx
git commit -m "feat: integrate Executive Summary and Smart Insights into Inventory Report"
```

---

### Task 9: Update index.ts Exports

**Files:**
- Modify: `frontend/src/components/smartpos/reports/index.ts`

- [ ] **Step 1: Add new exports**

Add to the existing exports:
```typescript
export { default as BusinessPulseCard } from './BusinessPulseCard';
export { default as ExecutiveSummary } from './ExecutiveSummary';
export { default as SmartInsights } from './SmartInsights';
```

- [ ] **Step 2: Verify full compilation and commit**

```bash
cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | tail -5
git add frontend/src/components/smartpos/reports/index.ts
git commit -m "feat: export new Insights Hub components"
```
```

---

### Task 10: Final Verification

- [ ] **Step 1: Full TypeScript check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 2: Verify dev server**

Run: `cd frontend && npm run dev`
Open:
- `http://localhost:5173/smartpos/reports` — Insights Hub with Business Pulse card
- `http://localhost:5173/smartpos/reports/sales` — Sales Report with Executive Summary + Smart Insights

Verify:
- BusinessPulseCard loads and displays AI content
- ExecutiveSummary shows the generate button, generates content on click
- SmartInsights shows recommendations in a grid
- All existing charts and tables still render
