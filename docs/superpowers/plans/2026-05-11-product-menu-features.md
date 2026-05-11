# Product Menu Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three missing product menu features: Variants (enhanced product form), Bundles/Kits (standalone page), Price Lists (full stack).

**Architecture:** Variants stay embedded in ProductDetailPage via a variant matrix builder. Bundles get a new BundlesListPage reusing the existing combo API and ComboItemsEditor. Price Lists need new backend entities/repos/controller/service + new frontend pages.

**Tech Stack:** Java 21 / Spring Boot 3 / Hibernate / Flyway (backend), React 19 / MUI 6 / React Router 7 (frontend).

---

## Phase 1: Variants — Enhanced Product Form

### Task 1.1: Add variant matrix builder to ProductDetailPage

**Files:**
- Modify: `frontend/src/views/smartpos/products/ProductDetailPage.tsx`

Add a new `VariantMatrixBuilder` component and integrate it into the product form when `isEdit` and `type !== 'COMBO'`.

- [ ] **Step 1: Add VariantMatrixBuilder component inside ProductDetailPage.tsx**

Add this component after the existing internal sub-components (after `ValueOrInput`, before the final export):

```tsx
// ── Variant Matrix Builder ──────────────────────────────────────────────

interface VariantAxis {
  name: string;   // e.g. "Size", "Color"
  values: string; // comma-separated: "S,M,L"
}

function VariantMatrixBuilder({
  variants,
  onChange,
}: {
  variants: VariantInput[];
  onChange: (variants: VariantInput[]) => void;
}) {
  const [axes, setAxes] = useState<VariantAxis[]>([]);
  const [expanded, setExpanded] = useState(variants.length > 0);

  const generateCombinations = () => {
    const lists = axes
      .filter((a) => a.name.trim() && a.values.trim())
      .map((a) => a.values.split(',').map((v) => v.trim()).filter(Boolean));
    if (lists.length === 0) return;

    const combos: string[][] = lists.reduce(
      (acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])),
      [[]] as string[][],
    );

    const axisNames = axes.map((a) => a.name.trim());

    const newVariants: VariantInput[] = combos.map((combo) => {
      const name = combo.map((v, i) => `${axisNames[i]}:${v}`).join(' / ');
      const existing = variants.find((v) => v.name === name);
      return (
        existing ?? {
          name,
          code: undefined,
          cost: undefined,
          price: undefined,
          wholesalePrice: undefined,
          minPrice: undefined,
          imageUrl: undefined,
        }
      );
    });

    onChange(newVariants);
  };

  const updateVariant = (idx: number, patch: Partial<VariantInput>) => {
    const next = [...variants];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeVariant = (idx: number) => {
    onChange(variants.filter((_, i) => i !== idx));
  };

  const applyBulk = (field: 'cost' | 'price' | 'wholesalePrice' | 'minPrice', value: number) => {
    onChange(variants.map((v) => ({ ...v, [field]: value || undefined })));
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[800], flex: 1 }}>
          Variants
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            borderColor: brand.neutral[200],
            color: brand.neutral[600],
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </Stack>

      {expanded && (
        <Stack spacing={2}>
          {/* Axes builder */}
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              bgcolor: brand.neutral[50],
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: brand.neutral[700], mb: 1 }}>
              Variant Attributes
            </Typography>
            <Stack spacing={1}>
              {axes.map((axis, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Name (e.g. Size)"
                    value={axis.name}
                    onChange={(e) => {
                      const next = [...axes];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setAxes(next);
                    }}
                    sx={{ width: 160 }}
                  />
                  <TextField
                    size="small"
                    placeholder="Values (e.g. S,M,L)"
                    value={axis.values}
                    onChange={(e) => {
                      const next = [...axes];
                      next[idx] = { ...next[idx], values: e.target.value };
                      setAxes(next);
                    }}
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    onClick={() => setAxes(axes.filter((_, i) => i !== idx))}
                  >
                    <IconX size={16} />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<IconPlus size={14} />}
                onClick={() => setAxes([...axes, { name: '', values: '' }])}
                sx={{ textTransform: 'none', fontWeight: 600, alignSelf: 'flex-start' }}
              >
                Add attribute
              </Button>
            </Stack>
            <Button
              variant="contained"
              size="small"
              onClick={generateCombinations}
              disabled={axes.length === 0}
              sx={{
                mt: 1.5,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Generate Combinations
            </Button>
          </Box>

          {/* Variant grid */}
          {variants.length > 0 && (
            <Box>
              {/* Bulk apply toolbar */}
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                {(['cost', 'price', 'wholesalePrice', 'minPrice'] as const).map((field) => (
                  <TextField
                    key={field}
                    size="small"
                    type="number"
                    label={`Bulk ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                    placeholder="Apply to all"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) applyBulk(field, v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = Number((e.target as HTMLInputElement).value);
                        if (v > 0) applyBulk(field, v);
                      }
                    }}
                    sx={{ width: 150 }}
                    InputProps={{ sx: { borderRadius: '10px' } }}
                  />
                ))}
              </Stack>

              {/* Variant rows */}
              <Stack spacing={1}>
                {variants.map((v, idx) => (
                  <Stack
                    key={`${v.name}-${idx}`}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${brand.neutral[200]}`,
                      bgcolor: '#fff',
                      flexWrap: 'wrap',
                    }}
                    useFlexGap
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        minWidth: 140,
                        flex: { xs: '1 1 100%', sm: '0 0 auto' },
                      }}
                    >
                      {v.name}
                    </Typography>
                    <TextField
                      size="small"
                      label="Code"
                      value={v.code ?? ''}
                      onChange={(e) => updateVariant(idx, { code: e.target.value || undefined })}
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Cost"
                      type="number"
                      value={v.cost ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { cost: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Price"
                      type="number"
                      value={v.price ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { price: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Wholesale"
                      type="number"
                      value={v.wholesalePrice ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { wholesalePrice: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Image URL"
                      value={v.imageUrl ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { imageUrl: e.target.value || undefined })
                      }
                      sx={{ minWidth: 180, flex: 1 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <IconButton size="small" onClick={() => removeVariant(idx)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Add VariantInput import**

At the top of the file, `VariantInput` is already importable from `src/api/smartpos/products`. Add it to the existing import:

```tsx
import {
  createProduct,
  getProduct,
  listBrands,
  listCategories,
  listUnits,
  nextSku,
  updateProduct,
  type CreateProductBody,
  type Product,
  type VariantInput,
} from 'src/api/smartpos/products';
```

- [ ] **Step 3: Add IconPlus and IconTrash imports**

Add `IconPlus` and `IconTrash` to the existing `@tabler/icons-react` import if not already present.

- [ ] **Step 4: Add useState import for VariantMatrixBuilder**

`useState` is already imported — no change needed.

- [ ] **Step 5: Insert VariantMatrixBuilder in the form layout**

After the "Additional Info" section card (the card with `sectionRefs.current[2]`) and before the Description section, add a new card for variants (edit mode only, non-COMBO products). Find the closing `</Stack>` after the "Additional Info" card, and insert:

```tsx
{isEdit && form.type !== 'COMBO' && (
  <Card sx={{ ...cardSx, ...(flashedSection === 2 ? flashAnimation : {}) }}>
    <CardContent sx={{ p: 2.5 }}>
      <VariantMatrixBuilder
        variants={form.variants ?? []}
        onChange={(variants) => setField('variants', variants)}
      />
    </CardContent>
  </Card>
)}
```

Wait — this card uses the same `flashedSection` index as Additional Info. Insert it as a new card in the Stack containing Description and Identity. Actually, place it between the first row of cards (Pricing, Inventory, Additional Info) and the second row (Description, Identity). At line ~966 (after the closing `</Stack>` of the first row), add:

```tsx
{isEdit && form.type !== 'COMBO' && (
  <Card sx={{ ...cardSx }}>
    <CardContent sx={{ p: 2.5 }}>
      <VariantMatrixBuilder
        variants={form.variants ?? []}
        onChange={(variants) => setField('variants', variants)}
      />
    </CardContent>
  </Card>
)}
```

- [ ] **Step 6: Verify type check**

Run TypeScript compiler:

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos/frontend && npx tsc --noEmit --pretty 2>&1 | head -40
```

Expected: no errors related to `ProductDetailPage.tsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/smartpos/products/ProductDetailPage.tsx
git commit -m "feat: add variant matrix builder to product form"
```

---

### Task 1.2: Update sidebar — Variants menu item

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts:111`

- [ ] **Step 1: Replace the "soon" chip with a route link**

Change line 111 from:

```ts
{ id: uid(), title: 'Variants', icon: IconBox, ...soon },
```

to:

```ts
{ id: uid(), title: 'Variants', icon: IconBox, href: '/smartpos/products?variant=true' },
```

- [ ] **Step 2: Add `variant` to ProductSearchParams and update ProductsListPage to filter**

In `frontend/src/api/smartpos/products.ts`, add `variant` to `ProductSearchParams`:

```ts
export interface ProductSearchParams {
  search?: string;
  categoryId?: UUID;
  brandId?: UUID;
  status?: boolean;
  featured?: boolean;
  variant?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
```

The backend `search` method doesn't have a `variant` parameter yet, so filtering happens client-side. In `ProductsListPage.tsx`, read the `variant` URL search param and pass it to `listProducts`, then filter the page content locally:

```tsx
const [searchParams] = useSearchParams();
const variantFilter = searchParams.get('variant') === 'true';

// After fetching, filter by variant if needed:
useEffect(() => {
  listProducts(params)
    .then((page) => {
      let content = page.content;
      if (variantFilter) {
        content = content.filter((p) => p.variant);
      }
      // ... set state with filtered content
    });
}, [variantFilter]);
```

Note: The ProductsListPage already uses `useSearchParams` — add the `variant` filter logic inside its existing data-fetching effect.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts frontend/src/api/smartpos/products.ts
git commit -m "feat: add Variants menu item linking to filtered product list"
```

---

## Phase 2: Bundles / Kits — Standalone Page

### Task 2.1: Create BundlesListPage

**Files:**
- Create: `frontend/src/views/smartpos/products/BundlesListPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconBox,
  IconPackage,
  IconPlus,
  IconTrendingUp,
} from '@tabler/icons-react';

import { listProducts, type Product } from 'src/api/smartpos/products';
import { formatMoney } from 'src/utils/smartpos/currency';
import { brand } from 'src/theme/smartpos/brand';
import { PageHeader } from 'src/components/smartpos/PageHeader';

const cardSx = {
  borderRadius: '12px',
  border: `1px solid ${brand.neutral[200]}`,
  bgcolor: '#fff',
  boxShadow: `
    0 1px 2px ${brand.neutral[900]}06,
    0 4px 12px ${brand.neutral[900]}05
  `,
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
  height: '100%',
  '&:hover': {
    boxShadow: `
      0 4px 16px ${brand.neutral[900]}0D,
      0 8px 28px ${brand.neutral[900]}10
    `,
    borderColor: brand.primary[300],
    transform: 'translateY(-2px)',
  },
};

function totalCost(product: Product): number {
  return (product.comboItems ?? []).reduce(
    (sum, item) => sum + (item.unitCost ?? 0) * (item.qty ?? 1),
    0,
  );
}

function componentCount(product: Product): number {
  return (product.comboItems ?? []).length;
}

function margin(product: Product): number {
  const cost = totalCost(product);
  if (!cost || !product.price) return 0;
  return ((product.price - cost) / product.price) * 100;
}

export default function BundlesListPage() {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProducts({ size: 200 })
      .then((page) => {
        if (cancelled) return;
        setBundles(page.content.filter((p) => p.type === 'COMBO'));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load bundles');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box sx={{ pb: 3 }}>
        <PageHeader title="Bundles / Kits" subtitle="Combo products and kits" />
        <Grid container spacing={2}>
          {[1, 2, 3].map((n) => (
            <Grid key={n} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: '12px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader
        title="Bundles / Kits"
        subtitle={`${bundles.length} combo product${bundles.length !== 1 ? 's' : ''}`}
        actions={[
          {
            label: 'Create Bundle',
            icon: <IconPlus size={17} />,
            onClick: () => navigate('/smartpos/products/new?type=COMBO'),
            variant: 'primary',
          },
        ]}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {bundles.length === 0 ? (
        <Card
          sx={{
            borderRadius: '16px',
            border: `2px dashed ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
            p: 6,
            textAlign: 'center',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <IconPackage size={48} color={brand.neutral[400]} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[700] }}>
                No bundles yet
              </Typography>
              <Typography sx={{ color: brand.neutral[500], mt: 0.5 }}>
                Create your first combo product to bundle items together.
              </Typography>
            </Box>
            <Button
              variant="contained"
              component={RouterLink}
              to="/smartpos/products/new?type=COMBO"
              startIcon={<IconPlus size={16} />}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Create Bundle
            </Button>
          </Stack>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {bundles.map((bundle) => (
            <Grid key={bundle.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={cardSx}>
                <CardActionArea
                  component={RouterLink}
                  to={`/smartpos/products/${bundle.id}`}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: brand.primary[50],
                            color: brand.primary[600],
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <IconPackage size={22} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            noWrap
                            sx={{ fontWeight: 800, fontSize: 16, color: brand.neutral[900] }}
                          >
                            {bundle.name}
                          </Typography>
                          <Typography
                            noWrap
                            variant="caption"
                            sx={{ color: brand.neutral[500] }}
                          >
                            {bundle.code}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Chip
                          icon={<IconBox size={14} />}
                          label={`${componentCount(bundle)} components`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: 11,
                            bgcolor: brand.neutral[100],
                            borderRadius: '8px',
                          }}
                        />
                        <Chip
                          icon={<IconTrendingUp size={14} />}
                          label={`${margin(bundle).toFixed(0)}% margin`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: 11,
                            bgcolor:
                              margin(bundle) > 0 ? brand.success.light : brand.error.light,
                            color:
                              margin(bundle) > 0 ? brand.success.dark : brand.error.dark,
                            borderRadius: '8px',
                          }}
                        />
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 1,
                          p: 1.5,
                          borderRadius: '10px',
                          bgcolor: brand.neutral[50],
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 10, color: brand.neutral[500], fontWeight: 600 }}>
                            Component Cost
                          </Typography>
                          <Typography sx={{ fontWeight: 800, color: brand.neutral[800] }}>
                            {formatMoney(totalCost(bundle))}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 10, color: brand.neutral[500], fontWeight: 600 }}>
                            Sell Price
                          </Typography>
                          <Typography
                            sx={{ fontWeight: 800, color: brand.primary[600] }}
                          >
                            {formatMoney(bundle.price)}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/products/BundlesListPage.tsx
git commit -m "feat: add bundles/kits listing page"
```

---

### Task 2.2: Add route for BundlesListPage

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add lazy-load import**

After line 46 (`SmartPosPrintLabels`), add:

```ts
const SmartPosBundles = Loadable(
  lazy(() => import('../views/smartpos/products/BundlesListPage')),
);
```

- [ ] **Step 2: Add route under products children**

After `{ path: 'print-labels', element: <SmartPosPrintLabels /> },` (line ~396), add:

```ts
{ path: 'bundles', element: <SmartPosBundles /> },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add bundles page route"
```

---

### Task 2.3: Update sidebar — Bundles/Kits menu item

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts:114`

- [ ] **Step 1: Replace soon chip with route link**

Change line 114 from:

```ts
{ id: uid(), title: 'Bundles / Kits', icon: IconPackage, ...soon },
```

to:

```ts
{ id: uid(), title: 'Bundles / Kits', icon: IconPackage, href: '/smartpos/products/bundles' },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: add Bundles / Kits menu item with route"
```

---

### Task 2.4: Enhance ComboItemsEditor with real-time cost calculation

**Files:**
- Modify: `frontend/src/views/smartpos/products/ComboItemsEditor.tsx`

- [ ] **Step 1: Add cost summary at the bottom of the editor**

After the Save button (line ~172, inside the final `</Stack>`), add a cost summary card:

```tsx
{rows.length > 0 && (
  <Box
    sx={{
      mt: 1.5,
      p: 1.5,
      borderRadius: '10px',
      bgcolor: brand.neutral[50],
      border: `1px solid ${brand.neutral[200]}`,
    }}
  >
    <Stack direction="row" justifyContent="space-between" flexWrap="wrap" useFlexGap>
      <Box>
        <Typography sx={{ fontSize: 11, color: brand.neutral[500], fontWeight: 600 }}>
          Total Component Cost
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 20, color: brand.neutral[800] }}>
          {formatMoney(
            rows.reduce(
              (sum, r) => sum + (r.unitCost ?? 0) * (r.qty ?? 0),
              0,
            ),
          )}
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, color: brand.neutral[500], fontWeight: 600 }}>
          Components
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 20, color: brand.neutral[800] }}>
          {rows.length}
        </Typography>
      </Box>
    </Stack>
  </Box>
)}
```

- [ ] **Step 2: Add formatMoney import**

At the top of ComboItemsEditor.tsx, add:

```ts
import { formatMoney } from 'src/utils/smartpos/currency';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/smartpos/products/ComboItemsEditor.tsx
git commit -m "feat: add cost summary to combo items editor"
```

---

## Phase 3: Price Lists — Full Stack

### Task 3.1: Create Flyway migration

**Files:**
- Create: `backend/product-service/src/main/resources/db/migration/V5__price_lists.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- V5: Price lists with quantity tiers

CREATE TABLE price_lists (
    id              UUID        PRIMARY KEY,
    tenant_id       UUID,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    customer_group  VARCHAR(100),
    currency        VARCHAR(3)   NOT NULL DEFAULT 'TZS',
    active          BOOLEAN      NOT NULL DEFAULT true,
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_lists_tenant ON price_lists (tenant_id);
CREATE INDEX idx_price_lists_active ON price_lists (active) WHERE active = true;

CREATE TABLE price_list_lines (
    id              UUID        PRIMARY KEY,
    price_list_id   UUID        NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id      UUID        NOT NULL,
    variant_id      UUID,
    price           NUMERIC(19,4) NOT NULL,
    min_qty         NUMERIC(12,3) NOT NULL DEFAULT 1,
    max_qty         NUMERIC(12,3),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pl_lines_list ON price_list_lines (price_list_id);
CREATE INDEX idx_pl_lines_product ON price_list_lines (product_id);
CREATE INDEX idx_pl_lines_variant ON price_list_lines (variant_id) WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX idx_pl_lines_unique
    ON price_list_lines (price_list_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'), min_qty);
```

- [ ] **Step 2: Commit**

```bash
git add backend/product-service/src/main/resources/db/migration/V5__price_lists.sql
git commit -m "feat: add price_lists and price_list_lines tables"
```

---

### Task 3.2: Create PriceList entity

**Files:**
- Create: `backend/product-service/src/main/java/io/smartpos/product/domain/model/PriceList.java`

- [ ] **Step 1: Write the entity**

```java
package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "price_lists")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PriceList {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "customer_group", length = 100)
    private String customerGroup;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "TZS";

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "price_list_id")
    @OrderBy("product_id ASC, min_qty ASC")
    @Builder.Default
    private List<PriceListLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/product-service/src/main/java/io/smartpos/product/domain/model/PriceList.java
git commit -m "feat: add PriceList entity"
```

---

### Task 3.3: Create PriceListLine entity

**Files:**
- Create: `backend/product-service/src/main/java/io/smartpos/product/domain/model/PriceListLine.java`

- [ ] **Step 1: Write the entity**

```java
package io.smartpos.product.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "price_list_lines")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PriceListLine {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "price_list_id", insertable = false, updatable = false)
    private UUID priceListId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "price", nullable = false, precision = 19, scale = 4)
    private BigDecimal price;

    @Column(name = "min_qty", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal minQty = BigDecimal.ONE;

    @Column(name = "max_qty", precision = 12, scale = 3)
    private BigDecimal maxQty;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/product-service/src/main/java/io/smartpos/product/domain/model/PriceListLine.java
git commit -m "feat: add PriceListLine entity"
```

---

### Task 3.4: Create repositories

**Files:**
- Create: `backend/product-service/src/main/java/io/smartpos/product/domain/repository/PriceListRepository.java`
- Create: `backend/product-service/src/main/java/io/smartpos/product/domain/repository/PriceListLineRepository.java`

- [ ] **Step 1: PriceListRepository**

```java
package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.PriceList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface PriceListRepository extends JpaRepository<PriceList, UUID>, JpaSpecificationExecutor<PriceList> {
}
```

- [ ] **Step 2: PriceListLineRepository**

```java
package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.PriceListLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PriceListLineRepository extends JpaRepository<PriceListLine, UUID> {
    List<PriceListLine> findByPriceListIdOrderByProductIdAscMinQtyAsc(UUID priceListId);
    void deleteByPriceListId(UUID priceListId);
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/product-service/src/main/java/io/smartpos/product/domain/repository/PriceListRepository.java backend/product-service/src/main/java/io/smartpos/product/domain/repository/PriceListLineRepository.java
git commit -m "feat: add PriceList and PriceListLine repositories"
```

---

### Task 3.5: Create DTOs

**Files:**
- Create: `backend/product-service/src/main/java/io/smartpos/product/api/dto/PriceListDto.java`
- Create: `backend/product-service/src/main/java/io/smartpos/product/api/dto/PriceListLineDto.java`
- Create: `backend/product-service/src/main/java/io/smartpos/product/api/dto/CreatePriceListRequest.java`

- [ ] **Step 1: PriceListDto**

```java
package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.PriceList;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PriceListDto(
        UUID id,
        String name,
        String description,
        String customerGroup,
        String currency,
        boolean active,
        LocalDate startDate,
        LocalDate endDate,
        List<PriceListLineDto> lines
) {
    public static PriceListDto from(PriceList pl, List<PriceListLineDto> lines) {
        return new PriceListDto(
                pl.getId(), pl.getName(), pl.getDescription(),
                pl.getCustomerGroup(), pl.getCurrency(), pl.isActive(),
                pl.getStartDate(), pl.getEndDate(), lines);
    }

    public static PriceListDto headerOnly(PriceList pl) {
        return new PriceListDto(
                pl.getId(), pl.getName(), pl.getDescription(),
                pl.getCustomerGroup(), pl.getCurrency(), pl.isActive(),
                pl.getStartDate(), pl.getEndDate(), null);
    }
}
```

- [ ] **Step 2: PriceListLineDto**

```java
package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.PriceListLine;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceListLineDto(
        UUID id,
        UUID productId,
        UUID variantId,
        BigDecimal price,
        BigDecimal minQty,
        BigDecimal maxQty
) {
    public static PriceListLineDto from(PriceListLine line) {
        return new PriceListLineDto(
                line.getId(), line.getProductId(), line.getVariantId(),
                line.getPrice(), line.getMinQty(), line.getMaxQty());
    }
}
```

- [ ] **Step 3: CreatePriceListRequest**

```java
package io.smartpos.product.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreatePriceListRequest(
        @NotBlank @Size(max = 150) String name,
        String description,
        @Size(max = 100) String customerGroup,
        String currency,
        Boolean active,
        LocalDate startDate,
        LocalDate endDate,
        List<LineInput> lines
) {
    public record LineInput(
            java.util.UUID productId,
            java.util.UUID variantId,
            @jakarta.validation.constraints.NotNull BigDecimal price,
            BigDecimal minQty,
            BigDecimal maxQty
    ) {}
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/product-service/src/main/java/io/smartpos/product/api/dto/PriceListDto.java backend/product-service/src/main/java/io/smartpos/product/api/dto/PriceListLineDto.java backend/product-service/src/main/java/io/smartpos/product/api/dto/CreatePriceListRequest.java
git commit -m "feat: add PriceList DTOs"
```

---

### Task 3.6: Create PriceListService

**Files:**
- Create: `backend/product-service/src/main/java/io/smartpos/product/application/PriceListService.java`

- [ ] **Step 1: Write the service**

```java
package package io.smartpos.product.application;

import io.smartpos.product.api.dto.CreatePriceListRequest;
import io.smartpos.product.api.dto.PriceListDto;
import io.smartpos.product.api.dto.PriceListLineDto;
import io.smartpos.product.domain.model.PriceList;
import io.smartpos.product.domain.model.PriceListLine;
import io.smartpos.product.domain.repository.PriceListLineRepository;
import io.smartpos.product.domain.repository.PriceListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceListService {

    private final PriceListRepository priceListRepository;
    private final PriceListLineRepository priceListLineRepository;

    public Page<PriceListDto> list(Pageable pageable) {
        return priceListRepository.findAll(pageable)
                .map(PriceListDto::headerOnly);
    }

    public PriceListDto get(UUID id) {
        PriceList pl = priceListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price list not found"));
        List<PriceListLineDto> lines = priceListLineRepository
                .findByPriceListIdOrderByProductIdAscMinQtyAsc(id)
                .stream().map(PriceListLineDto::from).toList();
        return PriceListDto.from(pl, lines);
    }

    @Transactional
    public PriceListDto create(CreatePriceListRequest req) {
        PriceList pl = PriceList.builder()
                .name(req.name())
                .description(req.description())
                .customerGroup(req.customerGroup())
                .currency(req.currency() != null ? req.currency() : "TZS")
                .active(req.active() != null ? req.active() : true)
                .startDate(req.startDate())
                .endDate(req.endDate())
                .build();
        pl = priceListRepository.save(pl);
        if (req.lines() != null && !req.lines().isEmpty()) {
            replaceLines(pl.getId(), req.lines());
        }
        return get(pl.getId());
    }

    @Transactional
    public PriceListDto update(UUID id, CreatePriceListRequest req) {
        PriceList pl = priceListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price list not found"));
        pl.setName(req.name());
        pl.setDescription(req.description());
        pl.setCustomerGroup(req.customerGroup());
        if (req.currency() != null) pl.setCurrency(req.currency());
        if (req.active() != null) pl.setActive(req.active());
        pl.setStartDate(req.startDate());
        pl.setEndDate(req.endDate());
        priceListRepository.save(pl);
        if (req.lines() != null) {
            replaceLines(id, req.lines());
        }
        return get(id);
    }

    @Transactional
    public void delete(UUID id) {
        PriceList pl = priceListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price list not found"));
        priceListRepository.delete(pl);
    }

    @Transactional
    public List<PriceListLineDto> replaceLines(UUID priceListId, List<CreatePriceListRequest.LineInput> inputs) {
        priceListLineRepository.deleteByPriceListId(priceListId);
        List<PriceListLine> lines = new ArrayList<>();
        for (var input : inputs) {
            lines.add(PriceListLine.builder()
                    .priceListId(priceListId)
                    .productId(input.productId())
                    .variantId(input.variantId())
                    .price(input.price())
                    .minQty(input.minQty() != null ? input.minQty() : java.math.BigDecimal.ONE)
                    .maxQty(input.maxQty())
                    .build());
        }
        lines = priceListLineRepository.saveAll(lines);
        return lines.stream().map(PriceListLineDto::from).toList();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/product-service/src/main/java/io/smartpos/product/application/PriceListService.java
git commit -m "feat: add PriceListService with CRUD and line replacement"
```

---

### Task 3.7: Create PriceListController

**Files:**
- Create: `backend/product-service/src/main/java/io/smartpos/product/api/PriceListController.java`

- [ ] **Step 1: Write the controller**

```java
package io.smartpos.product.api;

import io.smartpos.product.api.dto.CreatePriceListRequest;
import io.smartpos.product.api.dto.PriceListDto;
import io.smartpos.product.api.dto.PriceListLineDto;
import io.smartpos.product.application.PriceListService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/price-lists")
@RequiredArgsConstructor
public class PriceListController {

    private final PriceListService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public Page<PriceListDto> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.view')")
    public PriceListDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.create')")
    public ResponseEntity<PriceListDto> create(@Valid @RequestBody CreatePriceListRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product.update')")
    public PriceListDto update(@PathVariable UUID id, @Valid @RequestBody CreatePriceListRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PutMapping("/{id}/lines")
    @PreAuthorize("hasAuthority('product.update')")
    public List<PriceListLineDto> replaceLines(
            @PathVariable UUID id,
            @Valid @RequestBody List<CreatePriceListRequest.LineInput> inputs) {
        return service.replaceLines(id, inputs);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/product-service/src/main/java/io/smartpos/product/api/PriceListController.java
git commit -m "feat: add PriceListController REST API"
```

---

### Task 3.8: Create frontend API layer for price lists

**Files:**
- Create: `frontend/src/api/smartpos/priceLists.ts`
- Modify: `frontend/src/api/smartpos/types.ts`

- [ ] **Step 1: Add types to types.ts**

After the `Supplier` interface (around line 185), add:

```ts
export interface PriceList {
  id: UUID;
  name: string;
  description?: string | null;
  customerGroup?: string | null;
  currency: string;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  lines?: PriceListLine[];
}

export interface PriceListLine {
  id: UUID;
  productId: UUID;
  variantId?: UUID | null;
  price: number;
  minQty: number;
  maxQty?: number | null;
}
```

- [ ] **Step 2: Create priceLists.ts**

```ts
import { api } from './client';
import type { Page, PriceList, PriceListLine, UUID } from './types';

export interface PriceListInput {
  name: string;
  description?: string;
  customerGroup?: string;
  currency?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  lines?: PriceListLineInput[];
}

export interface PriceListLineInput {
  productId: UUID;
  variantId?: UUID;
  price: number;
  minQty?: number;
  maxQty?: number;
}

export async function listPriceLists(params?: {
  page?: number;
  size?: number;
}): Promise<Page<PriceList>> {
  const { data } = await api.get<Page<PriceList>>('/api/v1/price-lists', { params });
  return data;
}

export async function getPriceList(id: UUID): Promise<PriceList> {
  const { data } = await api.get<PriceList>(`/api/v1/price-lists/${id}`);
  return data;
}

export async function createPriceList(body: PriceListInput): Promise<PriceList> {
  const { data } = await api.post<PriceList>('/api/v1/price-lists', body);
  return data;
}

export async function updatePriceList(id: UUID, body: PriceListInput): Promise<PriceList> {
  const { data } = await api.put<PriceList>(`/api/v1/price-lists/${id}`, body);
  return data;
}

export async function deletePriceList(id: UUID): Promise<void> {
  await api.delete(`/api/v1/price-lists/${id}`);
}

export async function replacePriceListLines(
  priceListId: UUID,
  lines: PriceListLineInput[],
): Promise<PriceListLine[]> {
  const { data } = await api.put<PriceListLine[]>(
    `/api/v1/price-lists/${priceListId}/lines`,
    lines,
  );
  return data;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/smartpos/priceLists.ts frontend/src/api/smartpos/types.ts
git commit -m "feat: add price list API layer and types"
```

---

### Task 3.9: Create PriceListsPage

**Files:**
- Create: `frontend/src/views/smartpos/products/PriceListsPage.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconPlus,
  IconReceipt2,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';

import {
  createPriceList,
  deletePriceList,
  listPriceLists,
  type PriceListInput,
  type PriceList,
} from 'src/api/smartpos/priceLists';
import { brand } from 'src/theme/smartpos/brand';
import { PageHeader } from 'src/components/smartpos/PageHeader';

export default function PriceListsPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetch = () => {
    setLoading(true);
    listPriceLists({ size: 100 })
      .then((page) => setLists(page.content))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createPriceList({ name: newName.trim() });
      setNewName('');
      navigate(`/smartpos/products/price-lists/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePriceList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <Box sx={{ pb: 3 }}>
        <PageHeader title="Price Lists" subtitle="Tiered and group-based pricing" />
        <Grid container spacing={2}>
          {[1, 2, 3].map((n) => (
            <Grid key={n} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: '12px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader
        title="Price Lists"
        subtitle={`${lists.length} price list${lists.length !== 1 ? 's' : ''}`}
        actions={[
          {
            label: 'New Price List',
            icon: <IconPlus size={17} />,
            onClick: () => setNewName(''),
            variant: 'primary',
          },
        ]}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {lists.length === 0 ? (
        <Card
          sx={{
            borderRadius: '16px',
            border: `2px dashed ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
            p: 6,
            textAlign: 'center',
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <IconReceipt2 size={48} color={brand.neutral[400]} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[700] }}>
                No price lists yet
              </Typography>
              <Typography sx={{ color: brand.neutral[500], mt: 0.5 }}>
                Create a price list to define tiered or group-based pricing.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Price list name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                sx={{ minWidth: 200 }}
                InputProps={{ sx: { borderRadius: '10px' } }}
              />
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                startIcon={<IconPlus size={16} />}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Create
              </Button>
            </Stack>
          </Stack>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {lists.map((pl) => (
            <Grid key={pl.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                sx={{
                  borderRadius: '12px',
                  border: `1px solid ${brand.neutral[200]}`,
                  bgcolor: '#fff',
                  '&:hover': {
                    boxShadow: `0 4px 20px ${brand.neutral[900]}0D`,
                    borderColor: brand.primary[300],
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/smartpos/products/price-lists/${pl.id}`)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          noWrap
                          sx={{ fontWeight: 800, fontSize: 16, color: brand.neutral[900] }}
                        >
                          {pl.name}
                        </Typography>
                        {pl.description && (
                          <Typography
                            noWrap
                            sx={{ color: brand.neutral[500], fontSize: 13, mt: 0.25 }}
                          >
                            {pl.description}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(pl.id);
                        }}
                        sx={{ color: brand.neutral[400], '&:hover': { color: brand.error.main } }}
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
                      <Chip
                        icon={<IconUsersGroup size={14} />}
                        label={pl.customerGroup || 'All customers'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: brand.primary[50],
                          color: brand.primary[700],
                          borderRadius: '8px',
                        }}
                      />
                      <Chip
                        label={pl.active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: pl.active ? brand.success.light : brand.neutral[100],
                          color: pl.active ? brand.success.dark : brand.neutral[600],
                          borderRadius: '8px',
                        }}
                      />
                      <Chip
                        label={`${pl.lines?.length ?? 0} lines`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          bgcolor: brand.neutral[100],
                          color: brand.neutral[600],
                          borderRadius: '8px',
                        }}
                      />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/products/PriceListsPage.tsx
git commit -m "feat: add price lists listing page"
```

---

### Task 3.10: Create PriceListDetailPage

**Files:**
- Create: `frontend/src/views/smartpos/products/PriceListDetailPage.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

import {
  getPriceList,
  updatePriceList,
  replacePriceListLines,
  type PriceListInput,
  type PriceListLineInput,
  type PriceList,
} from 'src/api/smartpos/priceLists';
import { listProducts, type Product } from 'src/api/smartpos/products';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { PageHeader } from 'src/components/smartpos/PageHeader';

interface LineRow extends PriceListLineInput {
  productName?: string;
}

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: UUID }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState<PriceListInput>({ name: '' });
  const [rows, setRows] = useState<LineRow[]>([]);
  const [productPicker, setProductPicker] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPriceList(id)
      .then((pl) => {
        if (cancelled) return;
        setForm({
          name: pl.name,
          description: pl.description ?? '',
          customerGroup: pl.customerGroup ?? '',
          currency: pl.currency,
          active: pl.active,
          startDate: pl.startDate ?? '',
          endDate: pl.endDate ?? '',
          lines: pl.lines ?? [],
        });
        setRows(
          (pl.lines ?? []).map((l) => ({
            productId: l.productId,
            variantId: l.variantId ?? undefined,
            price: l.price,
            minQty: l.minQty,
            maxQty: l.maxQty ?? undefined,
          })),
        );
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const handle = setTimeout(() => {
      listProducts({ search: productPicker, size: 8 })
        .then((p) => setProductOptions(p.content))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [productPicker]);

  const setField = <K extends keyof PriceListInput>(key: K, value: PriceListInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addLine = (p: Product) => {
    if (rows.some((r) => r.productId === p.id)) return;
    setRows((prev) => [
      ...prev,
      {
        productId: p.id,
        price: p.price,
        minQty: 1,
        maxQty: undefined,
        productName: p.name,
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeLine = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!id || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const body: PriceListInput = {
        ...form,
        lines: rows.map((r) => ({
          productId: r.productId,
          variantId: r.variantId,
          price: r.price,
          minQty: r.minQty,
          maxQty: r.maxQty,
        })),
      };
      await updatePriceList(id, body);
      setInfo('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Box sx={{ pb: 3 }}>
      <Button
        onClick={() => navigate('/smartpos/products/price-lists')}
        variant="text"
        startIcon={<IconArrowLeft size={15} />}
        sx={{
          color: brand.neutral[500],
          fontWeight: 600,
          fontSize: '0.8125rem',
          mb: 1,
          textTransform: 'none',
          borderRadius: '8px',
          '&:hover': { color: brand.primary[600], bgcolor: brand.neutral[50] },
        }}
      >
        Back to Price Lists
      </Button>

      <PageHeader
        title={form.name || 'Price List'}
        subtitle={form.customerGroup ? `Group: ${form.customerGroup}` : 'All customers'}
        actions={[
          {
            label: saving ? 'Saving…' : 'Save',
            icon: <IconDeviceFloppy size={17} />,
            onClick: handleSave,
            variant: 'primary',
          },
        ]}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {info && <Alert severity="success" onClose={() => setInfo(null)} sx={{ mb: 2 }}>{info}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="General" />
        <Tab label={`Lines (${rows.length})`} />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, p: 2.5 }}>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label="Name"
              size="small"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              size="small"
              value={form.description ?? ''}
              onChange={(e) => setField('description', e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Customer Group"
              size="small"
              value={form.customerGroup ?? ''}
              onChange={(e) => setField('customerGroup', e.target.value)}
              helperText="Free-text tag (e.g. VIP, Wholesale, Walk-in)"
              fullWidth
            />
            <TextField
              label="Currency"
              size="small"
              value={form.currency ?? 'TZS'}
              onChange={(e) => setField('currency', e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Status"
              size="small"
              value={form.active ?? true ? 'active' : 'inactive'}
              onChange={(e) => setField('active', e.target.value === 'active')}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, p: 2.5 }}>
          <Stack spacing={2}>
            {/* Product picker */}
            <Autocomplete
              options={productOptions}
              value={null}
              inputValue={productPicker}
              onInputChange={(_, v) => setProductPicker(v)}
              onChange={(_, p) => { if (p) { addLine(p); setProductPicker(''); } }}
              getOptionLabel={(p) => `${p.code} — ${p.name}`}
              renderInput={(params) => (
                <TextField {...params} placeholder="Add product to price list…" size="small" />
              )}
            />

            {/* Lines */}
            {rows.length === 0 ? (
              <Typography sx={{ color: brand.neutral[500], textAlign: 'center', py: 4 }}>
                No products added yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {rows.map((r, idx) => (
                  <Stack
                    key={`${r.productId}-${idx}`}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${brand.neutral[200]}`,
                      flexWrap: 'wrap',
                    }}
                    useFlexGap
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 13, minWidth: 160, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      {r.productName ?? r.productId.slice(0, 8)}
                    </Typography>
                    <TextField
                      size="small"
                      label="Price"
                      type="number"
                      value={r.price}
                      onChange={(e) => updateLine(idx, { price: Number(e.target.value) })}
                      sx={{ width: 120 }}
                    />
                    <TextField
                      size="small"
                      label="Min Qty"
                      type="number"
                      value={r.minQty ?? 1}
                      onChange={(e) => updateLine(idx, { minQty: Number(e.target.value) || 1 })}
                      sx={{ width: 100 }}
                    />
                    <TextField
                      size="small"
                      label="Max Qty"
                      type="number"
                      value={r.maxQty ?? ''}
                      onChange={(e) =>
                        updateLine(idx, { maxQty: Number(e.target.value) || undefined })
                      }
                      placeholder="∞"
                      sx={{ width: 100 }}
                    />
                    <IconButton size="small" onClick={() => removeLine(idx)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/products/PriceListDetailPage.tsx
git commit -m "feat: add price list detail/edit page"
```

---

### Task 3.11: Add price list routes

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add lazy-load imports**

After the SmartPosBundles import (added in Task 2.2), add:

```ts
const SmartPosPriceLists = Loadable(
  lazy(() => import('../views/smartpos/products/PriceListsPage')),
);
const SmartPosPriceListDetail = Loadable(
  lazy(() => import('../views/smartpos/products/PriceListDetailPage')),
);
```

- [ ] **Step 2: Add routes under products children**

After the bundles route (added in Task 2.2), add:

```ts
{ path: 'price-lists', element: <SmartPosPriceLists /> },
{ path: 'price-lists/:id', element: <SmartPosPriceListDetail /> },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add price list routes"
```

---

### Task 3.12: Update sidebar — Price Lists menu item

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts:115`

- [ ] **Step 1: Replace soon chip with route link**

Change line 115 from:

```ts
{ id: uid(), title: 'Price Lists', icon: IconReceipt2, ...soon },
```

to:

```ts
{ id: uid(), title: 'Price Lists', icon: IconReceipt2, href: '/smartpos/products/price-lists' },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git commit -m "feat: add Price Lists menu item with route"
```

---

### Task 3.13: Final verification — type-check and backend compile

- [ ] **Step 1: Run frontend type check**

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos/frontend && npx tsc --noEmit --pretty 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 2: Compile backend**

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos/backend/product-service && mvn compile -q 2>&1 | tail -20
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit any fixes if needed**
