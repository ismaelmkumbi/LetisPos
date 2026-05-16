# Document Template — Tenant Branding & Logo Support

**Date:** 2026-05-16
**Status:** draft

## Context

The backend document service generates PDFs (invoices, receipts, quotations, etc.) through 42 Handlebars templates rendered to HTML and converted via Gotenberg. Currently:

- `company.name` is hardcoded to `"Letis POS"` in `DocumentService.java:98`
- `company.logoUrl` is never populated — templates have a `.logo` CSS class that renders text only
- `company.address`, `company.phone`, `company.email`, `company.tin`, `company.website` are all empty
- `PosSetting` (in sales-service) already stores all needed branding fields: `storeName`, `logoUrl`, `storeAddress`, `storePhone`, `storeEmail`, `storeTaxId`, `storeWebsite`, plus display toggles

## Design

### Part 1 — Fetch branding from PosSetting (backend)

#### 1a. New Feign client in document-service

The document-service cannot call `PosSetting` directly (it's in sales-service's database). Create a Feign client:

```
document-service
  └─ infrastructure/feign/PosSettingClient.java  (new)

@FeignClient(name = "sales-service")
interface PosSettingClient {
    @GetMapping("/api/v1/pos-settings")
    PosSettingDto getByWarehouse(@RequestParam UUID warehouseId);
}
```

The sales-service already exposes `GET /api/v1/pos-settings/warehouse/{warehouseId}` via `PosSettingController`.

Key fields in `PosSettingDto` we need:
- `storeName`, `logoUrl`, `storeAddress`, `storePhone`, `storeEmail`, `storeTaxId`, `storeWebsite`
- `showLogo`, `logoSize`, `showStoreName`, `showStoreAddress`, etc.

A minimal `PosSettingDto` record in document-service captures just the fields we use.

#### 1b. Modify DocumentService.generate()

Current (line 98):
```java
mergedContext.putIfAbsent("company", Map.of("name", "Letis POS"));
```

Replace with a method `enrichCompanyContext()` that:
1. If the caller already passed `company` in `contextData`, use it (trust override)
2. Otherwise, if the sale/purchase has a `warehouseId`, fetch `PosSetting` for that warehouse
3. If no warehouse (e.g. standalone document), fetch default `PosSetting`
4. Map `PosSetting` fields to the `company` context map:
   - `name` ← `storeName`
   - `logoUrl` ← `logoUrl`
   - `address` ← `storeAddress`
   - `phone` ← `storePhone`
   - `email` ← `storeEmail`
   - `tin` ← `storeTaxId`
   - `website` ← `storeWebsite`
   - `showLogo` ← `showLogo`
   - `logoSize` ← `logoSize`
5. Apply display toggles to the context so templates can use them (`{{#if company.showLogo}}...{{/if}}`)

### Part 2 — Update Handlebars templates

#### 2a. Add logo image to templates

In each `.hbs` template, replace the current text-based `.logo` div:

```html
<!-- Before -->
<div class="logo">{{company.name}}</div>

<!-- After -->
{{#if company.showLogo}}
  {{#if company.logoUrl}}
    <img src="{{company.logoUrl}}" style="max-height:{{company.logoSize}}px;" class="logo-img" />
  {{else}}
    <div class="logo">{{company.name}}</div>
  {{/if}}
{{else}}
  <div class="logo">{{company.name}}</div>
{{/if}}
```

The `logoSize` field from PosSetting (default 60) controls image max-height. If no logo URL is set, fall back to company name text — preserving current behavior.

#### 2b. Update template CSS

Add to the inline `<style>` block in each template:
```css
.logo-img { max-height: 60px; object-fit: contain; }
```

#### 2c. Add company details block

Templates that have a company info section should display stored details:

```html
<div class="company-info">
  <div class="company-name">{{company.name}}</div>
  {{#if company.showStoreAddress}}{{#if company.address}}<div>{{company.address}}</div>{{/if}}{{/if}}
  {{#if company.showStorePhone}}{{#if company.phone}}<div>{{company.phone}}</div>{{/if}}{{/if}}
  {{#if company.showStoreEmail}}{{#if company.email}}<div>{{company.email}}</div>{{/if}}{{/if}}
  {{#if company.tin}}<div>TIN: {{company.tin}}</div>{{/if}}
  {{#if company.website}}<div>{{company.website}}</div>{{/if}}
</div>
```

#### 2d. Scope: Update all templates or a subset?

Updating all 42 templates is mechanical but high-volume. Start with the most commonly used templates:

**Phase 1 (high-use):** `tax-invoice.hbs`, `payment-receipt.hbs`, `quotation.hbs`, `proforma-invoice.hbs`, `delivery-note.hbs`, `purchase-order.hbs`, `credit-note.hbs`, `goods-received.hbs`

**Phase 2:** Remaining 34 templates (can be batched as follow-up)

### Part 3 — Logo URL resolution

The `logoUrl` in `PosSetting` is stored as a URL string (e.g., `"https://minio.example.com/bucket/tenant-abc/logo.png"`). The Gotenberg converter will fetch this URL when rendering the PDF. For this to work:
- If the logo is in MinIO (object storage), the URL must be publicly accessible or use a pre-signed URL
- If using pre-signed URLs, the document-service must generate a fresh signed URL before passing to Gotenberg
- For simplicity, assume logos are uploaded to a public or authenticated CDN URL

No changes needed for URL handling in this spec — we use the URL as stored.

### Error handling

| Scenario | Behavior |
|---|---|
| PosSetting not found for warehouse | Fall back to `{ name: "Letis POS" }` |
| sales-service unreachable | Fall back to `{ name: "Letis POS" }` |
| logoUrl is empty/null | Templates render company name as text (current behavior) |
| logoUrl points to broken image | Gotenberg renders broken image placeholder; no crash |
| Client passes `company` in `contextData` | Client override wins (backwards compatible) |

### Files changed

**Backend (document-service):**
- `infrastructure/feign/PosSettingClient.java` — new Feign client
- `application/DocumentService.java` — enrich company context from PosSetting
- `resources/templates/*.hbs` — add logo image + company details (Phase 1: 8 templates)

### Rollback

- New Feign client is additive — removing it falls back to hardcoded default
- Template changes are backwards compatible — templates still render correctly without `logoUrl`/`showLogo` in context
- Existing generated documents (stored as PDFs in MinIO) unaffected
