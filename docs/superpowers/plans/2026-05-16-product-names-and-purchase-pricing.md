# Product Names & Purchase Pricing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix "Unknown Product" in dashboard/reports by resolving product names at write time via Feign, and fix purchase page showing retail price instead of cost price.

**Architecture:** Add a `ProductClient` Feign interface in sales-service to call product-service for name resolution when the client doesn't provide a valid name. Create a shared `ProductNameResolver` component. Add `priceField` prop to `LineEditor` for cost-vs-price selection.

**Tech Stack:** Java 17+ Spring Boot, Spring Cloud OpenFeign, Flyway, React TypeScript, MUI

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/sales-service/.../infrastructure/feign/ProductClient.java` | Create | Feign client for product-service |
| `backend/sales-service/.../application/ProductNameResolver.java` | Create | Shared name-resolution logic wrapping ProductClient |
| `backend/sales-service/.../application/SaleService.java` | Modify | Inject ProductNameResolver, replace fallback |
| `backend/sales-service/.../application/PurchaseService.java` | Modify | Inject ProductNameResolver, replace fallback |
| `backend/sales-service/.../application/QuotationService.java` | Modify | Inject ProductNameResolver, replace fallback |
| `backend/sales-service/.../application/SaleReturnService.java` | Modify | Inject ProductNameResolver, replace fallback |
| `backend/sales-service/.../application/PurchaseReturnService.java` | Modify | Inject ProductNameResolver, replace fallback |
| `backend/sales-service/.../resources/db/migration/V14__backfill_product_names.sql` | Create | Backfill migration |
| `frontend/src/components/smartpos/LineEditor.tsx` | Modify | Add `priceField` prop |
| `frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx` | Modify | Pass `priceField="cost"`, remove UUID resolution |
| `frontend/src/views/smartpos/sales/SaleBuilderPage.tsx` | Modify | Remove UUID resolution |

---

### Task 1: Create ProductClient Feign interface

**Files:**
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/ProductClient.java`

- [ ] **Step 1: Write the ProductClient interface**

```java
package io.smartpos.sales.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Minimal Feign client for product-service name resolution.
 */
@FeignClient(name = "product-service")
public interface ProductClient {

    record ProductNameDto(UUID id, String name) {}

    @GetMapping("/api/v1/products/{id}")
    ProductNameDto getProduct(@PathVariable UUID id);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/infrastructure/feign/ProductClient.java
git commit -m "feat: add ProductClient Feign interface for name resolution"
```

---

### Task 2: Create ProductNameResolver shared component

**Files:**
- Create: `backend/sales-service/src/main/java/io/smartpos/sales/application/ProductNameResolver.java`

- [ ] **Step 1: Write the ProductNameResolver class**

```java
package io.smartpos.sales.application;

import io.smartpos.sales.infrastructure.feign.ProductClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Resolves product names for snapshot storage.
 *
 * Fast path: if the client already sent a human-readable name, use it directly
 * (no remote call). Only calls product-service when the name is missing or
 * looks like a raw UUID.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductNameResolver {

    private static final Pattern UUID_PATTERN =
        Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                        Pattern.CASE_INSENSITIVE);

    private final ProductClient productClient;

    /**
     * Resolve a display-worthy product name.
     *
     * @param productId          the product to resolve
     * @param clientProvidedName what the client sent (may be null, blank, or a UUID)
     * @return a human-readable name, never null
     */
    public String resolve(UUID productId, String clientProvidedName) {
        if (clientProvidedName != null && !clientProvidedName.isBlank()
            && !UUID_PATTERN.matcher(clientProvidedName).matches()) {
            return clientProvidedName;
        }
        try {
            return productClient.getProduct(productId).name();
        } catch (Exception e) {
            log.warn("Failed to resolve product name for {}: {}", productId, e.getMessage());
            if (clientProvidedName != null && !clientProvidedName.isBlank()) {
                return clientProvidedName;
            }
            return "Product " + productId.toString().substring(0, 8);
        }
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/ProductNameResolver.java
git commit -m "feat: add ProductNameResolver shared component"
```

---

### Task 3: Update SaleService

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/SaleService.java:59-65` (add field), `:243` (replace fallback)

- [ ] **Step 1: Inject ProductNameResolver**

At line 65 (after `private final UserFeign userFeign;`), add:
```java
    private final ProductNameResolver productNameResolver;
```

- [ ] **Step 2: Replace the "Unknown Product" fallback at line 243**

Change:
```java
.productNameSnapshot(in.productName() != null && !in.productName().isBlank() ? in.productName() : "Unknown Product")
```

To:
```java
.productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/SaleService.java
git commit -m "fix: resolve product name via product-service in SaleService"
```

---

### Task 4: Update PurchaseService

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseService.java:37-42` (add field), `:85` (replace fallback)

- [ ] **Step 1: Inject ProductNameResolver**

At line 42 (after `private final OutboxPublisher outbox;`), add:
```java
    private final ProductNameResolver productNameResolver;
```

- [ ] **Step 2: Replace the "Unknown Product" fallback at line 85**

Change:
```java
.productNameSnapshot(in.productName() != null && !in.productName().isBlank() ? in.productName() : "Unknown Product")
```

To:
```java
.productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseService.java
git commit -m "fix: resolve product name via product-service in PurchaseService"
```

---

### Task 5: Update QuotationService

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/QuotationService.java:27-30` (add field), `:73` (replace fallback)

- [ ] **Step 1: Inject ProductNameResolver**

At line 30 (after `private final OutboxPublisher outbox;`), add:
```java
    private final ProductNameResolver productNameResolver;
```

- [ ] **Step 2: Replace the "Unknown Product" fallback at line 73**

Change:
```java
.productNameSnapshot(in.productName() != null && !in.productName().isBlank() ? in.productName() : "Unknown Product")
```

To:
```java
.productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/QuotationService.java
git commit -m "fix: resolve product name via product-service in QuotationService"
```

---

### Task 6: Update SaleReturnService

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/SaleReturnService.java:37-40` (add field), `:85` (replace fallback)

- [ ] **Step 1: Inject ProductNameResolver**

At line 41 (after `private final OutboxPublisher outbox;`), add:
```java
    private final ProductNameResolver productNameResolver;
```

- [ ] **Step 2: Replace the "Unknown Product" fallback at line 85**

Change:
```java
.productNameSnapshot(in.productName() != null && !in.productName().isBlank() ? in.productName() : "Unknown Product")
```

To:
```java
.productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/SaleReturnService.java
git commit -m "fix: resolve product name via product-service in SaleReturnService"
```

---

### Task 7: Update PurchaseReturnService

**Files:**
- Modify: `backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseReturnService.java:43-46` (add field), `:91` (replace fallback)

- [ ] **Step 1: Inject ProductNameResolver**

At line 47 (after `private final OutboxPublisher outbox;`), add:
```java
    private final ProductNameResolver productNameResolver;
```

- [ ] **Step 2: Replace the "Unknown Product" fallback at line 91**

Change:
```java
.productNameSnapshot(in.productName() != null && !in.productName().isBlank() ? in.productName() : "Unknown Product")
```

To:
```java
.productNameSnapshot(productNameResolver.resolve(in.productId(), in.productName()))
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/java/io/smartpos/sales/application/PurchaseReturnService.java
git commit -m "fix: resolve product name via product-service in PurchaseReturnService"
```

---

### Task 8: Create Flyway migration to backfill existing bad data

**Files:**
- Create: `backend/sales-service/src/main/resources/db/migration/V14__backfill_product_names.sql`

**Assumption:** The product-service `products` table is in the same PostgreSQL instance, in a schema accessible from the sales-service connection (e.g., `product_db.public.products` or same database). If the databases are separate, this becomes a manual step — see the note at the end of this task.

- [ ] **Step 1: Check database names**

```bash
grep -r "datasource\|database\|jdbc" backend/sales-service/src/main/resources/application*.yml backend/sales-service/src/main/resources/application*.properties 2>/dev/null | head -20
grep -r "datasource\|database\|jdbc" backend/product-service/src/main/resources/application*.yml backend/product-service/src/main/resources/application*.properties 2>/dev/null | head -20
```

Determine the product-service database/schema name. If they share a database, the migration references the same table. If they use separate databases, adjust the `FROM` clause accordingly.

- [ ] **Step 2: Write the migration**

```sql
-- V14: Backfill product_name_snapshot for rows with "Unknown Product" or UUIDs
-- Assumes product-service products table is accessible from this connection.
-- If product-service uses a different database, replace 'products' with
-- the appropriate foreign-table or dblink reference, or run as a manual script.

DO $$
DECLARE
    rec RECORD;
    product_schema TEXT;
BEGIN
    -- Try to locate the products table. Adjust schema name if needed.
    -- Common setups: same db different schema, or same db same schema.
    product_schema := 'public'; -- change if product-service uses a different schema

    -- 1. sale_lines
    FOR rec IN
        SELECT DISTINCT sl.product_id
        FROM sale_lines sl
        WHERE sl.product_name_snapshot = 'Unknown Product'
           OR sl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        UPDATE sale_lines sl
        SET product_name_snapshot = COALESCE(
            (SELECT p.name FROM products p WHERE p.id = rec.product_id AND p.deleted_at IS NULL),
            sl.product_name_snapshot
        )
        WHERE sl.product_id = rec.product_id
          AND (sl.product_name_snapshot = 'Unknown Product'
               OR sl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    END LOOP;

    -- 2. purchase_lines
    FOR rec IN
        SELECT DISTINCT pl.product_id
        FROM purchase_lines pl
        WHERE pl.product_name_snapshot = 'Unknown Product'
           OR pl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        UPDATE purchase_lines pl
        SET product_name_snapshot = COALESCE(
            (SELECT p.name FROM products p WHERE p.id = rec.product_id AND p.deleted_at IS NULL),
            pl.product_name_snapshot
        )
        WHERE pl.product_id = rec.product_id
          AND (pl.product_name_snapshot = 'Unknown Product'
               OR pl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    END LOOP;

    -- 3. quotation_lines
    FOR rec IN
        SELECT DISTINCT ql.product_id
        FROM quotation_lines ql
        WHERE ql.product_name_snapshot = 'Unknown Product'
           OR ql.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        UPDATE quotation_lines ql
        SET product_name_snapshot = COALESCE(
            (SELECT p.name FROM products p WHERE p.id = rec.product_id AND p.deleted_at IS NULL),
            ql.product_name_snapshot
        )
        WHERE ql.product_id = rec.product_id
          AND (ql.product_name_snapshot = 'Unknown Product'
               OR ql.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    END LOOP;

    -- 4. sale_return_lines
    FOR rec IN
        SELECT DISTINCT srl.product_id
        FROM sale_return_lines srl
        WHERE srl.product_name_snapshot = 'Unknown Product'
           OR srl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        UPDATE sale_return_lines srl
        SET product_name_snapshot = COALESCE(
            (SELECT p.name FROM products p WHERE p.id = rec.product_id AND p.deleted_at IS NULL),
            srl.product_name_snapshot
        )
        WHERE srl.product_id = rec.product_id
          AND (srl.product_name_snapshot = 'Unknown Product'
               OR srl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    END LOOP;

    -- 5. purchase_return_lines
    FOR rec IN
        SELECT DISTINCT prl.product_id
        FROM purchase_return_lines prl
        WHERE prl.product_name_snapshot = 'Unknown Product'
           OR prl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    LOOP
        UPDATE purchase_return_lines prl
        SET product_name_snapshot = COALESCE(
            (SELECT p.name FROM products p WHERE p.id = rec.product_id AND p.deleted_at IS NULL),
            prl.product_name_snapshot
        )
        WHERE prl.product_id = rec.product_id
          AND (prl.product_name_snapshot = 'Unknown Product'
               OR prl.product_name_snapshot ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    END LOOP;
END $$;
```

- [ ] **Step 3: Verify migration file is valid SQL syntax**

```bash
cd backend/sales-service && ./mvnw flyway:info -q 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add backend/sales-service/src/main/resources/db/migration/V14__backfill_product_names.sql
git commit -m "feat: add V14 migration to backfill bad product_name_snapshot data"
```

**Important:** If the sales-service and product-service use separate PostgreSQL instances (not just separate databases), this SQL migration cannot join across instances. In that case:
- Skip the SQL migration
- Instead, after deploying the `ProductClient` changes, run this script manually or create a Spring `CommandLineRunner` bean that calls `ProductClient.getProduct()` to resolve each bad `product_id` and updates the local row
- The `CommandLineRunner` approach:

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class ProductNameBackfill implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final ProductNameResolver resolver;

    @Override
    public void run(String... args) {
        List<UUID> ids = jdbc.queryForList(
            "SELECT DISTINCT product_id FROM sale_lines WHERE product_name_snapshot IN ('Unknown Product')",
            UUID.class);
        // ... similar for purchase_lines, quotation_lines, etc.
        for (UUID id : ids) {
            String name = resolver.resolve(id, null);
            jdbc.update("UPDATE sale_lines SET product_name_snapshot = ? WHERE product_id = ?", name, id);
            // ... repeat per table
        }
    }
}
```

---

### Task 9: Add priceField prop to LineEditor

**Files:**
- Modify: `frontend/src/components/smartpos/LineEditor.tsx:28-37` (add prop), `:48-59` (use prop), `:107-109` (show correct price in option)

- [ ] **Step 1: Add `priceField` to the LineEditorProps interface**

At line 33 (after `priceLabel?: string;`), add:
```typescript
  /** Which product field to use as default unit price. Default: 'price'. */
  priceField?: 'cost' | 'price';
```

- [ ] **Step 2: Destructure with default in the function signature**

At line 42, change:
```typescript
  lines, onChange, searchProducts, priceLabel = 'Price', disabled = false,
```

To:
```typescript
  lines, onChange, searchProducts, priceLabel = 'Price', priceField = 'price', disabled = false,
```

- [ ] **Step 3: Use `priceField` in `addProduct`**

At line 55, change:
```typescript
        unitPrice: p.price,
```

To:
```typescript
        unitPrice: p[priceField],
```

- [ ] **Step 4: Show the correct price in the autocomplete option**

At line 108, change:
```typescript
                  {p.code} · {fmt(p.price)}
```

To:
```typescript
                  {p.code} · {fmt(priceField === 'cost' ? p.cost : p.price)}
```

- [ ] **Step 5: Run frontend type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/smartpos/LineEditor.tsx
git commit -m "feat: add priceField prop to LineEditor for cost vs retail price"
```

---

### Task 10: Wire priceField="cost" in PurchaseBuilderPage

**Files:**
- Modify: `frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx:421-425`

- [ ] **Step 1: Add `priceField="cost"` to the LineEditor usage**

At line 425, change:
```tsx
            priceLabel="Unit cost"
```

To:
```tsx
            priceLabel="Unit cost"
            priceField="cost"
```

- [ ] **Step 2: Run frontend type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx
git commit -m "fix: use cost price as default unit price on purchase page"
```

---

### Task 11: Remove legacy UUID resolution from SaleBuilderPage

**Files:**
- Modify: `frontend/src/views/smartpos/sales/SaleBuilderPage.tsx:51` (remove UUID_RE), `:132-156` (remove resolution block)

- [ ] **Step 1: Remove the UUID_RE constant at line 51**

Delete:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

- [ ] **Step 2: Remove the UUID resolution block at lines 132-156**

Delete the entire block from:
```typescript
        const toResolve = Array.from(
          new Set(mapped.filter((l) => UUID_RE.test(l.productName)).map((l) => l.productId)),
        );
        if (toResolve.length > 0) {
          Promise.all(
            toResolve.map((pid) =>
              getProduct(pid)
                .then((prod) => ({ id: pid, name: prod.name, code: prod.code }))
                .catch(() => null),
            ),
          ).then((results) => {
            const byId = new Map<string, { id: string; name: string; code?: string }>();
            for (const r of results) {
              if (r) byId.set(r.id, r);
            }
            if (byId.size === 0) return;
            setLines((prev) =>
              prev.map((l) => {
                const hit = byId.get(l.productId);
                if (!hit) return l;
                return { ...l, productName: hit.name, productCode: l.productCode ?? hit.code };
              }),
            );
          });
        }
```

- [ ] **Step 3: Remove unused import `getProduct` if no longer needed**

Check if `getProduct` is used elsewhere in the file:
```bash
grep -n "getProduct" frontend/src/views/smartpos/sales/SaleBuilderPage.tsx
```

If only used in the removed block, remove `getProduct` from the import at line 49:
```typescript
// Before:
import { listProducts, getProduct } from 'src/api/smartpos/products';
// After (if getProduct is unused):
import { listProducts } from 'src/api/smartpos/products';
```

- [ ] **Step 4: Run frontend type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/smartpos/sales/SaleBuilderPage.tsx
git commit -m "chore: remove legacy UUID-to-name resolution in SaleBuilderPage"
```

---

### Task 12: Remove legacy UUID resolution from PurchaseBuilderPage

**Files:**
- Modify: `frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx:36` (remove UUID_RE), `:157-182` (remove resolution block)

- [ ] **Step 1: Remove the UUID_RE constant at line 36**

Delete:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

- [ ] **Step 2: Remove the UUID resolution block at lines 157-182**

Delete the entire block from:
```typescript
        // Legacy records stored productId as the name snapshot. Resolve real names.
        const toResolve = Array.from(
          new Set(mapped.filter((l) => UUID_RE.test(l.productName)).map((l) => l.productId)),
        );
        if (toResolve.length > 0) {
          Promise.all(
            toResolve.map((pid) =>
              getProduct(pid)
                .then((prod) => ({ id: pid, name: prod.name, code: prod.code }))
                .catch(() => null),
            ),
          ).then((results) => {
            const byId = new Map<string, { id: string; name: string; code?: string }>();
            for (const r of results) {
              if (r) byId.set(r.id, r);
            }
            if (byId.size === 0) return;
            setLines((prev) =>
              prev.map((l) => {
                const hit = byId.get(l.productId);
                if (!hit) return l;
                return { ...l, productName: hit.name, productCode: l.productCode ?? hit.code };
              }),
            );
          });
        }
```

- [ ] **Step 3: Remove unused import `getProduct` if no longer needed**

Check if `getProduct` is used elsewhere in the file:
```bash
grep -n "getProduct" frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx
```

If only used in the removed block, remove `getProduct` from the import at line 34:
```typescript
// Before:
import { listProducts, getProduct, uploadProductImage } from 'src/api/smartpos/products';
// After (if getProduct is unused):
import { listProducts, uploadProductImage } from 'src/api/smartpos/products';
```

- [ ] **Step 4: Run frontend type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx
git commit -m "chore: remove legacy UUID-to-name resolution in PurchaseBuilderPage"
```

---

### Task 13: Final verification

- [ ] **Step 1: Run full backend compilation**

```bash
cd backend/sales-service && ./mvnw compile -q
```

- [ ] **Step 2: Run full frontend type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Verify no remaining "Unknown Product" references**

```bash
grep -rn "Unknown Product" backend/sales-service/src/main/java/
```

Expected: no output (all replaced).

- [ ] **Step 4: Verify no remaining `UUID_RE` in builder pages**

```bash
grep -rn "UUID_RE" frontend/src/views/smartpos/sales/SaleBuilderPage.tsx frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx
```

Expected: no output (all removed).

---

## Error Handling Summary

| Scenario | Behavior |
|---|---|
| product-service unreachable during line creation | `ProductNameResolver` logs warning; uses client-provided name if present; falls back to `"Product {id-prefix}"` |
| product-service unreachable during migration | Migration fails; deploy product-service first, then re-run migration |
| Product deleted after line creation | No impact — `product_name_snapshot` is a point-in-time snapshot |
| `priceField` not provided in LineEditor | Defaults to `'price'` (backwards compatible) |

## Rollback

- Migration is idempotent (only updates rows matching bad patterns)
- Frontend changes are backwards compatible (new prop defaults to current behavior)
- Backend changes are additive (new Feign client + new component, existing behavior preserved for valid inputs)
