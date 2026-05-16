# Product Names & Purchase Pricing — Design Spec

**Date:** 2026-05-16
**Status:** draft

## Context

Two data-quality bugs in the POS system:

1. **Dashboard and reports show "Unknown Product"** — The backend writes `"Unknown Product"` as a literal fallback into `product_name_snapshot` when creating sale/purchase lines. Legacy records also have raw UUIDs stored as product names. The frontend resolves these in detail views but not in dashboard/reports.

2. **Purchase page shows retail price instead of buying price** — `LineEditor` always uses `p.price` (retail) when adding a product, even when used for purchases. The purchase page passes `priceLabel="Unit cost"` but that only changes the column header.

## Architecture

The sales-service uses a **snapshot pattern**: when a sale or purchase is created, the frontend sends `productId` + `productName` + `productCode` in each line. These are stored directly in `sale_lines`/`purchase_lines` as `product_name_snapshot` / `product_code_snapshot`. The sales-service never calls the product-service for validation or enrichment.

## Design

### Part 1 — Resolve product names at write time (backend)

**Goal:** Never store `"Unknown Product"` again. Always persist the real product name.

**Approach:** Create a Feign client in sales-service that calls product-service to resolve the product name when the client doesn't provide one (or provides a bad one).

#### 1a. New Feign client: `ProductClient`

```
sales-service
  └─ infrastructure/feign/ProductClient.java  (new)

@FeignClient(name = "product-service")
interface ProductClient {
    @GetMapping("/api/v1/products/{id}")
    ProductDto getProduct(@PathVariable UUID id);
}
```

A minimal `ProductDto` record is needed in sales-service (just `id` + `name` — the only fields we need).

#### 1b. Modify `SaleService.createSale()` and `PurchaseService.createPurchase()`

Current (both services):
```java
.productNameSnapshot(in.productName() != null && !in.productName().isBlank()
    ? in.productName() : "Unknown Product")
```

New logic:
```java
.productNameSnapshot(resolveProductName(in.productId(), in.productName()))
```

Where `resolveProductName` is a private helper:
```java
private String resolveProductName(UUID productId, String clientProvidedName) {
    if (clientProvidedName != null && !clientProvidedName.isBlank()
        && !clientProvidedName.matches(UUID_REGEX)) {
        return clientProvidedName;
    }
    try {
        return productClient.getProduct(productId).name();
    } catch (Exception e) {
        log.warn("Failed to resolve product name for {}: {}", productId, e.getMessage());
        return clientProvidedName != null && !clientProvidedName.isBlank()
            ? clientProvidedName : "Product " + productId.toString().substring(0, 8);
    }
}
```

Key behaviors:
- If the client sends a real name → use it (no API call, fast path)
- If the client sends null/blank/UUID → resolve from product-service
- If the product-service call fails → use client-provided value if present, otherwise a stable fallback (`"Product {id-prefix}"`) that's clearly not a real name but won't lose data

Also apply the same fix to: `SaleReturnService`, `PurchaseReturnService`, `QuotationService`, `RecurringInvoiceService`.

#### 1c. Database migration (Flyway)

A Java-based Flyway migration (Java-based because it needs to call product-service API to resolve names):

```
V10__backfill_product_names.java
```

Logic:
1. Query all `sale_lines` where `product_name_snapshot = 'Unknown Product'` or matches UUID pattern
2. For each distinct `product_id`, call product-service to get the real name
3. UPDATE all rows with the resolved name
4. Repeat for `purchase_lines`, `quotation_lines`, `sale_return_lines`, `purchase_return_lines`

If the migration can use a SQL cross-database query (if both services share the same Postgres instance), that's simpler — but the Java approach is universal.

#### 1d. Remove frontend UUID resolution

In `SaleBuilderPage.tsx` and `PurchaseBuilderPage.tsx`, remove the legacy UUID → name resolution code (the `UUID_RE.test(l.productName)` blocks). After the migration runs, no records will have UUIDs in `product_name_snapshot`.

### Part 2 — Purchase page uses cost price (frontend)

**Goal:** When a product is added to a purchase, the unit price defaults to the product's **cost** (buying price), not its retail price.

#### 2a. Add `priceField` prop to `LineEditor`

```typescript
export interface LineEditorProps {
  // ... existing props ...
  /** Which product field to use as default unit price. Default: 'price'. */
  priceField?: 'cost' | 'price';
}
```

In `addProduct`:
```typescript
// Before:
unitPrice: p.price,
// After:
unitPrice: p[priceField],
```

The autocomplete option display (line 108) should also show the correct field:
```typescript
// Before:
{p.code} · {fmt(p.price)}
// After:
{p.code} · {fmt(priceField === 'cost' ? p.cost : p.price)}
```

#### 2b. Wire in `PurchaseBuilderPage`

```tsx
<LineEditor
  lines={lines}
  onChange={(l) => { setLines(l); setFormDirty(true); }}
  searchProducts={searchProducts}
  priceLabel="Unit cost"
  priceField="cost"       // ← new
/>
```

`SaleBuilderPage` needs no changes — the default `'price'` is correct.

### Error handling

| Scenario | Behavior |
|---|---|
| product-service unreachable during sale/purchase creation | Log warning; use client-provided name if present; fall back to `"Product {id-prefix}"` |
| product-service unreachable during migration | Migration fails; operator retries after product-service is up |
| Product deleted after line created | No impact — `product_name_snapshot` is a point-in-time snapshot |
| `priceField` not provided | Defaults to `'price'` (backwards compatible) |

### Testing

- **Feign client:** Unit test `resolveProductName` with mock ProductClient
- **Migration:** Test with seed data containing "Unknown Product" and UUID-pattern names
- **LineEditor:** Unit test that `priceField="cost"` uses `p.cost`, `priceField="price"` uses `p.price`
- **Integration:** Create a purchase with a product that has distinct cost vs price; verify line shows cost
- **Dashboard:** After migration, verify top-products widget shows real names

### Rollback

- Migration is idempotent (only updates rows that match the bad patterns)
- Frontend change is backwards compatible (new prop defaults to current behavior)

## References

- `backend/sales-service/src/main/java/io/smartpos/sales/application/SaleService.java:243`
- `backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseService.java:85`
- `frontend/src/components/smartpos/LineEditor.tsx:55`
- `frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx:425`
