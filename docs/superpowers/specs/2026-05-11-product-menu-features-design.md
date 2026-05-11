# Product Menu — Missing Features Implementation

## Scope

Implement the 3 "soon"-marked features in the Products sidebar menu:

1. **Variants** — enhanced inline variant builder in the product form
2. **Bundles / Kits** — dedicated combo-products page
3. **Price Lists** — full-stack: customer-group tiers + quantity breaks

---

## 1. Variants — Enhanced Product Form

### Backend
Already complete. `ProductVariant` is a `@OneToMany` child of `Product` with cascade persist. Variants carry: name, code, cost, price, wholesalePrice, minPrice, imageUrl. The `ProductController` reads/writes variants through the existing CRUD endpoints.

### Frontend

**ProductDetailPage enhancements (edit mode):**

- **Variant attribute builder** — user defines attribute axes (e.g. "Size: S, M, L" and "Color: Red, Blue") and clicks "Generate Combinations" to produce the cartesian product.
- **Variant grid** — an editable table showing each variant row: name, code, cost, price, wholesale price, min price, image URL. Inline editing. Bulk price apply (e.g. "set all cost to X").
- **Variant image gallery** — each variant can have its own image. Gallery scrolls per-variant images alongside the main product image.
- **Variant barcodes** — each variant can link to its own barcode via the existing `barcodes[].variantId` field.

**Sidebar update:**
- "Variants" menu item → `/smartpos/products?variant=true` (filtered product list showing only products with `variant: true`).

**Files changed:**
- `frontend/src/views/smartpos/products/ProductDetailPage.tsx` — add variant matrix builder + grid
- `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts` — update href for Variants

**No new pages created.**

---

## 2. Bundles / Kits — Standalone Page

### Backend
Already complete. `ProductComboController` exposes `GET/PUT /api/v1/products/{id}/combo-items`. `Product.type=COMBO` marks a bundle. Combo items carry component product, quantity, cost/price snapshots, and display position.

### Frontend

**New page: `BundlesListPage.tsx`**
- Route: `/smartpos/products/bundles`
- Lists all products where `type === 'COMBO'`
- Each bundle card shows: bundle name, component count, total component cost, bundle sell price, profit margin
- "Create Bundle" button opens product create form with type pre-set to COMBO
- Each card links to the product detail page for editing

**Enhanced bundle builder in ProductDetailPage:**
- When `type === 'COMBO'`, an additional section card appears: "Bundle Composition"
- Reuses `ComboItemsEditor` with enhancements:
  - Real-time cost summation as components are added
  - Suggested sell price (component cost + X% margin)
  - Bundle stock — derived from the least-available component (informational only)
- Component product picker with search + stock-on-hand display

**Files changed:**
- `frontend/src/views/smartpos/products/BundlesListPage.tsx` — NEW
- `frontend/src/views/smartpos/products/ProductDetailPage.tsx` — enhanced combo section
- `frontend/src/views/smartpos/products/ComboItemsEditor.tsx` — enhanced with cost calc
- `frontend/src/routes/Router.tsx` — add bundle route
- `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts` — update href

---

## 3. Price Lists — Full Stack

### Backend (new)

**Entities:**
- `PriceList` — id, tenantId, name, description, customerGroup (optional, free-text string since Customer Groups aren't implemented yet), currency, active, startDate, endDate, createdAt, updatedAt
- `PriceListLine` — id, priceListId, productId, variantId (optional, nullable), price, minQty (default 1), maxQty (nullable = no upper limit), createdAt

**API (`PriceListController`):**
- `GET /api/v1/price-lists` — list all (paginated, filterable by active/group)
- `GET /api/v1/price-lists/{id}` — single price list with lines
- `POST /api/v1/price-lists` — create
- `PUT /api/v1/price-lists/{id}` — update header
- `DELETE /api/v1/price-lists/{id}` — soft delete
- `PUT /api/v1/price-lists/{id}/lines` — replace all lines (batch save)
- `GET /api/v1/price-lists/resolve?productId=X&customerId=Y&qty=Z` — resolves effective price (Redis-cached hot path for POS)

**Service:**
- `PriceListService` — CRUD + resolution logic. Resolution: find active price list for customer's group → match line by productId (and optionally variantId) → find tier where qty falls between minQty and maxQty → return price. Fall back to product base price.

**Files created (backend):**
- `product-service/.../domain/model/PriceList.java`
- `product-service/.../domain/model/PriceListLine.java`
- `product-service/.../domain/repository/PriceListRepository.java`
- `product-service/.../domain/repository/PriceListLineRepository.java`
- `product-service/.../api/PriceListController.java`
- `product-service/.../api/dto/PriceListDto.java`
- `product-service/.../api/dto/PriceListLineDto.java`
- `product-service/.../api/dto/CreatePriceListRequest.java`
- `product-service/.../application/PriceListService.java`
- `product-service/src/main/resources/db/migration/V5__price_lists.sql`

### Frontend (new)

**New page: `PriceListsPage.tsx`**
- Route: `/smartpos/products/price-lists`
- Lists all price lists with card layout
- Each card: name, customer group badge, line count, active/inactive toggle
- "New Price List" button

**New page: `PriceListDetailPage.tsx`**
- Route: `/smartpos/products/price-lists/:id`
- Two-tab layout: "General" (name, group, currency, active dates) and "Lines" (product picker + price + quantity range table)
- Product picker with search, auto-fills current price
- Quantity tier rows: min qty, max qty, price per unit
- Import CSV button for bulk price updates
- Save is a single PUT that replaces all lines

**API layer (`priceLists.ts`):**
- `listPriceLists`, `getPriceList`, `createPriceList`, `updatePriceList`, `deletePriceList`
- `replacePriceListLines`
- Types: `PriceList`, `PriceListLine`, `PriceListInput`, `PriceListLineInput`

**Files created/changed (frontend):**
- `frontend/src/api/smartpos/priceLists.ts` — NEW
- `frontend/src/views/smartpos/products/PriceListsPage.tsx` — NEW
- `frontend/src/views/smartpos/products/PriceListDetailPage.tsx` — NEW
- `frontend/src/api/smartpos/types.ts` — add PriceList types
- `frontend/src/routes/Router.tsx` — add price list routes
- `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts` — update href

---

## Sidebar Menu Updates

Update these entries in `SmartPosMenuItems.ts` to remove `soon` chip and add href:

| Item | Old | New |
|------|-----|-----|
| Variants | `...soon` | `href: '/smartpos/products?variant=true'` |
| Bundles / Kits | `...soon` | `href: '/smartpos/products/bundles'` |
| Price Lists | `...soon` | `href: '/smartpos/products/price-lists'` |

---

## Route Additions

```ts
// In Router.tsx, under products children:
{ path: 'bundles', element: <SmartPosBundles /> },
{ path: 'price-lists', element: <SmartPosPriceLists /> },
{ path: 'price-lists/:id', element: <SmartPosPriceListDetail /> },
```

Lazy-load entries for `BundlesListPage`, `PriceListsPage`, `PriceListDetailPage`.

---

## Implementation Order

1. **Variants** (backend done, frontend enhancement only — fastest)
2. **Bundles/Kits** (backend done, new page + reuse existing components — medium)
3. **Price Lists** (full stack — longest)

---

## Testing

- Variants: verify variant matrix generates correct combinations, variant data persists through save/load, variant prices display in POS
- Bundles: verify COMBO products list correctly, bundle composition saves, component picker filters out the bundle itself
- Price Lists: verify CRUD, line replacement, resolution returns correct tier for quantity range, POS integration resolves correct price
