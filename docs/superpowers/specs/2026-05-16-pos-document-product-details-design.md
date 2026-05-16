# POS Terminal — Missing Product Details in Generated Documents

**Date:** 2026-05-16
**Status:** draft

## Context

When a sale is completed in the POS terminal and the user clicks "Generate Doc," the generated document (PDF via document-service) shows generic product names like `"Product 769ef700"` instead of real product names. Other line details (product code) are also missing.

## Root Cause

`PosTerminalPage.tsx` checkout (`lines.map(...)`) does not include `productName` or `productCode` in the line payload sent to `POST /api/v1/pos/sales`. The SaleBuilderPage includes both fields; POS omits them.

The backend `ProductNameResolver` then must call product-service via Feign to resolve the name. If that call fails, a generic fallback `"Product {id-prefix}"` is stored in `product_name_snapshot`.

## Fix

Add `productName` and `productCode` to the POS checkout lines payload.

**File:** `frontend/src/views/smartpos/pos/PosTerminalPage.tsx:509-516`

Before:
```typescript
lines: lines.map((l) => ({
  productId: l.productId,
  variantId: l.variantId,
  unitPrice: l.unitPrice,
  qty: l.qty,
  taxRate: l.taxRate,
  taxMethod: posSettings?.defaultTaxMethod || undefined,
})),
```

After:
```typescript
lines: lines.map((l) => ({
  productId: l.productId,
  productName: l.productName,
  productCode: l.productCode,
  variantId: l.variantId,
  unitPrice: l.unitPrice,
  qty: l.qty,
  taxRate: l.taxRate,
  taxMethod: posSettings?.defaultTaxMethod || undefined,
})),
```

The POS terminal already has product names/codes in its local `Line` state (set by `addProduct` when the cashier selects a product). They just weren't being sent.

## Impact

- `ProductNameResolver` hits its fast path (client-provided valid name) — no remote call needed
- `productCodeSnapshot` gets populated instead of remaining null
- Generated documents (PDFs, receipts, invoices) show real product names
- POS checkout becomes consistent with SaleBuilderPage checkout
