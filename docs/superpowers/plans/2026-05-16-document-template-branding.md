# Document Template Branding & Logo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate document template `company` context with real branding data from PosSetting (logo, address, phone, etc.) and add `<img>` tag support to templates.

**Architecture:** New `PosSettingClient` Feign in document-service calls `GET /api/v1/pos-settings?warehouseId={id}` on sales-service. `DocumentService.generate()` enriches the `company` map with PosSetting fields (storeName, logoUrl, address, phone, email, TIN, website, display toggles). Templates updated to show `<img>` when logoUrl is set, falling back to text when it's not.

**Tech Stack:** Java 17 Spring Boot, Spring Cloud OpenFeign, Handlebars templates, Gotenberg PDF converter

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/document-service/.../infrastructure/feign/PosSettingClient.java` | Create | Feign client for sales-service pos-settings |
| `backend/document-service/.../application/DocumentService.java` | Modify | Enrich company context from PosSetting |
| `backend/document-service/.../templates/tax-invoice.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/payment-receipt.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/quotation.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/proforma-invoice.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/delivery-note.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/purchase-order.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/credit-note.hbs` | Modify | Logo img + toggle-aware company block |
| `backend/document-service/.../templates/goods-received.hbs` | Modify | Logo img + toggle-aware company block |

---

### Task 1: Create PosSettingClient Feign interface

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/PosSettingClient.java`

- [ ] **Step 1: Write the PosSettingClient interface**

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

/**
 * Feign client for sales-service PosSetting — fetches store branding.
 */
@FeignClient(name = "sales-service", url = "${spring.cloud.openfeign.client.config.sales-service.url}")
public interface PosSettingClient {

    /**
     * Minimal DTO for the branding fields we need from PosSetting.
     * PosSettingDto in sales-service has 30+ fields; we only map what templates use.
     */
    record BrandingDto(
        String storeName,
        String logoUrl,
        String storeAddress,
        String storePhone,
        String storeEmail,
        String storeTaxId,
        String storeWebsite,
        boolean showLogo,
        int     logoSize,
        boolean showStoreName,
        boolean showStoreAddress,
        boolean showStorePhone,
        boolean showStoreEmail
    ) {}

    @GetMapping("/api/v1/pos-settings")
    BrandingDto get(@RequestParam UUID warehouseId);
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd backend/document-service && mvn compile -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/PosSettingClient.java
git commit -m "feat: add PosSettingClient Feign for store branding"
```

---

### Task 2: Modify DocumentService to enrich company context

**Files:**
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java:36-39` (add field), `:88-115` (enrich company context), `:225-274` (extract warehouseId)

- [ ] **Step 1: Inject PosSettingClient**

At line 39 (after `private final io.smartpos.documents.infrastructure.feign.PaymentClient paymentClient;`), add:

```java
    private final io.smartpos.documents.infrastructure.feign.PosSettingClient posSettingClient;
```

- [ ] **Step 2: Extract warehouseId from reference data**

In `fetchReferenceData()`, after the existing `raw` map handling (line 235-274), add warehouseId extraction. Insert after `mapped.put("preparedBy", ...)` around line 266:

```java
            // Extract warehouseId for branding lookup
            if (raw.containsKey("warehouseId") && raw.get("warehouseId") != null) {
                mapped.put("warehouseId", raw.get("warehouseId"));
            }
```

- [ ] **Step 3: Replace hardcoded company with PosSetting enrichment**

Replace lines 97-98:
```java
        Map<String, Object> mergedContext = new java.util.HashMap<>(contextData);
        mergedContext.putIfAbsent("company", Map.of("name", "Letis POS"));
```

With:
```java
        Map<String, Object> mergedContext = new java.util.HashMap<>(contextData);

        // Enrich company/branding context from PosSetting if available
        if (!mergedContext.containsKey("company")) {
            mergedContext.put("company", buildCompanyContext(contextData));
        }
```

- [ ] **Step 4: Add buildCompanyContext private method**

Add after `fetchReferenceData()`:

```java
    private Map<String, Object> buildCompanyContext(Map<String, Object> contextData) {
        // Try to resolve warehouseId from context (passed by caller or from reference data)
        // The reference data has already been merged into mergedContext by this point,
        // but we call this before fetchReferenceData. So we check contextData only.
        // WarehouseId resolution happens in enrichCompanyContext below.
        return Map.of("name", "Letis POS"); // placeholder replaced by enrichCompanyContext
    }
```

Wait — the timing is wrong. `fetchReferenceData()` runs AFTER the company context is set. Let me restructure.

- [ ] **Step 4 (revised): Restructure generate() to resolve branding after reference data**

Replace the entire company + reference data section (lines 97-114) with:

```java
        Map<String, Object> mergedContext = new java.util.HashMap<>(contextData);

        // Fetch real transaction data if reference provided (needed for warehouseId)
        if (referenceType != null && referenceId != null) {
            try {
                Map<String, Object> realData = fetchReferenceData(referenceType, referenceId);
                mergedContext.putAll(realData);
            } catch (Exception e) {
                log.warn("Could not fetch {} data for {}: {}", referenceType, referenceId, e.getMessage());
            }
        }

        // Enrich company context from PosSetting
        if (!mergedContext.containsKey("company")) {
            mergedContext.put("company", resolveCompanyContext(mergedContext));
        }
```

- [ ] **Step 5: Add resolveCompanyContext method**

Add as a new private method in DocumentService:

```java
    /**
     * Builds the company context map for template rendering.
     * Resolves PosSetting using warehouseId from reference data or contextData.
     * Falls back to "Letis POS" default if PosSetting is unavailable.
     */
    private Map<String, Object> resolveCompanyContext(Map<String, Object> mergedContext) {
        UUID warehouseId = null;
        try {
            Object wid = mergedContext.get("warehouseId");
            if (wid instanceof UUID w) {
                warehouseId = w;
            } else if (wid instanceof String s) {
                warehouseId = UUID.fromString(s);
            }
        } catch (Exception e) {
            log.debug("No warehouseId in context for branding lookup");
        }

        if (warehouseId != null) {
            try {
                var branding = posSettingClient.get(warehouseId);
                return Map.of(
                    "name", branding.storeName() != null && !branding.storeName().isBlank()
                        ? branding.storeName() : "Letis POS",
                    "logoUrl", branding.logoUrl() != null ? branding.logoUrl() : "",
                    "address", branding.showStoreAddress() && branding.storeAddress() != null
                        ? branding.storeAddress() : "",
                    "phone", branding.showStorePhone() && branding.storePhone() != null
                        ? branding.storePhone() : "",
                    "email", branding.showStoreEmail() && branding.storeEmail() != null
                        ? branding.storeEmail() : "",
                    "tin", branding.storeTaxId() != null ? branding.storeTaxId() : "",
                    "website", branding.storeWebsite() != null ? branding.storeWebsite() : "",
                    "showLogo", branding.showLogo() && branding.logoUrl() != null
                        && !branding.logoUrl().isBlank(),
                    "logoSize", branding.logoSize() > 0 ? branding.logoSize() : 60
                );
            } catch (Exception e) {
                log.warn("Failed to fetch PosSetting for warehouse {}: {}", warehouseId, e.getMessage());
            }
        }

        return Map.of("name", "Letis POS");
    }
```

- [ ] **Step 6: Verify compilation**

```bash
cd backend/document-service && mvn compile -q
```

- [ ] **Step 7: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java
git commit -m "feat: enrich document company context from PosSetting branding"
```

---

### Task 3: Update 8 Phase-1 templates with logo img tag

**Files:**
- Modify: 8 `.hbs` files in `backend/document-service/src/main/resources/templates/`

**Pattern:** Each template has a `.logo` div showing `{{company.name}}` as text. Replace with conditional img/text block. Also make the company info section toggle-aware.

- [ ] **Step 1: Update tax-invoice.hbs**

The logo section (around line 50-60) currently shows:
```html
<div class="logo">{{company.name}}</div>
```

Replace the company name + address block (the left side of the header) with:

```html
  <div>
    {{#if company.showLogo}}
      {{#if company.logoUrl}}
        <img src="{{company.logoUrl}}" style="max-height:{{company.logoSize}}px; object-fit:contain;" />
      {{else}}
        <div class="logo">{{company.name}}</div>
      {{/if}}
    {{else}}
      <div class="logo">{{company.name}}</div>
    {{/if}}
    {{#if company.address}}<div style="font-size:11px;color:#555;">{{company.address}}</div>{{/if}}
    {{#if company.tin}}<div style="font-size:11px;color:#555;">TIN: {{company.tin}}</div>{{/if}}
    {{#if company.vatRegNo}}
    <div style="font-size:11px;color:#555;">VAT Reg: {{company.vatRegNo}}</div>
    {{/if}}
  </div>
  <div class="company-info">
    {{#if company.phone}}<div>{{company.phone}}</div>{{/if}}
    {{#if company.email}}<div>{{company.email}}</div>{{/if}}
    {{#if company.website}}<div>{{company.website}}</div>{{/if}}
  </div>
```

This replaces the existing logo + company-info divs in the header.

- [ ] **Step 2: Apply same pattern to the other 7 templates**

Each template has a slightly different header structure. The core change is the same:
1. Find the `.logo` div containing `{{company.name}}`
2. Replace with the conditional `{{#if company.showLogo}}...{{/if}}` block
3. Wrap company detail fields in `{{#if}}` blocks

Files to update:
- `payment-receipt.hbs`
- `quotation.hbs`
- `proforma-invoice.hbs`
- `delivery-note.hbs`
- `purchase-order.hbs`
- `credit-note.hbs`
- `goods-received.hbs`

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/main/resources/templates/tax-invoice.hbs \
        backend/document-service/src/main/resources/templates/payment-receipt.hbs \
        backend/document-service/src/main/resources/templates/quotation.hbs \
        backend/document-service/src/main/resources/templates/proforma-invoice.hbs \
        backend/document-service/src/main/resources/templates/delivery-note.hbs \
        backend/document-service/src/main/resources/templates/purchase-order.hbs \
        backend/document-service/src/main/resources/templates/credit-note.hbs \
        backend/document-service/src/main/resources/templates/goods-received.hbs
git commit -m "feat: add logo img and toggle-aware company details to Phase 1 templates"
```

---

### Task 4: Final verification

- [ ] **Step 1: Backend compilation**

```bash
cd backend/document-service && mvn compile -q
```

- [ ] **Step 2: Verify Feign client wiring**

```bash
grep -n "posSettingClient\|PosSettingClient\|resolveCompanyContext\|buildCompanyContext" backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java
```

- [ ] **Step 3: Verify no hardcoded "Letis POS" remains as the only company name path**

```bash
grep -n "Letis POS" backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java
```

Expected: only in fallback returns (lines in `resolveCompanyContext` method).

---

## Error Handling Summary

| Scenario | Behavior |
|---|---|
| PosSetting not found for warehouse | Fall back to `{ name: "Letis POS" }` |
| sales-service unreachable | Fall back to `{ name: "Letis POS" }` |
| `logoUrl` is empty/null | Templates render company name as text (current behavior) |
| `logoUrl` points to broken image | Gotenberg renders broken image placeholder; no crash |
| Client passes `company` in `contextData` | Client override wins (backwards compatible) |
| No warehouseId in reference data | Fall back to default |

## Rollback

- New Feign client is additive — removing it falls back to hardcoded default
- Template changes are backwards compatible — templates still render correctly without `logoUrl`/`showLogo` in context
- All Handlebars `{{#if}}` blocks evaluate to false when the field is absent, rendering nothing
