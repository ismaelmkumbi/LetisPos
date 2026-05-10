# Document & Print Management System — Phase 2 Design Spec

**Date:** 2026-05-10
**Status:** Approved
**Builds on:** Phase 1 (document-service, Gotenberg, 9 A4 templates, 6 frontend components)

## Overview

Phase 2 expands the Document & Print system with 6 subsystems: 25 new document types, QR codes, a block-based visual template editor, document version history, template versioning with rollback, and bulk document generation.

## Build Order & Effort

| # | Subsystem | Effort | Depends On |
|---|---|---|---|
| 1 | Remaining 25 Document Types | ~3 days | Nothing (pure templates) |
| 2 | QR Codes on Documents | ~1 day | Nothing |
| 3 | Visual Template Editor | ~5 days | Template system (Phase 1) |
| 4 | Document Version History | ~2 days | Document generation |
| 5 | Template Versioning & Rollback | ~2 days | Template overrides |
| 6 | Bulk Document Generation | ~3 days | Document generation, async infra |

**Total:** ~16 days

---

## Subsystem 1: Remaining 25 Document Types

Pure Handlebars template work — no new architecture. Each template follows the same pattern as Phase 1 (self-contained HTML with inline CSS, `@page` A4 directive, consistent header/footer).

### Templates by Category

**Stock & Inventory (5):**
- `stock-transfer.hbs` — Transfer form with from/to warehouse fields
- `stock-count.hbs` — Count sheet with expected vs actual columns
- `stock-adjustment.hbs` — Adjustment authorization form
- `batch-traceability.hbs` — Batch/lot tracking report
- `expiry-report.hbs` — Expiring stock report

**Accounting & Finance (5):**
- `journal-voucher.hbs` — Journal entry document
- `payment-voucher.hbs` — Payment authorization
- `receipt-voucher.hbs` — Cash receipt
- `expense-voucher.hbs` — Expense claim with receipt references
- `debit-note.hbs` — Supplier debit note

**Purchasing (3):**
- `supplier-rfq.hbs` — Request for quotation to suppliers
- `supplier-invoice.hbs` — Supplier invoice matching form
- `purchase-return.hbs` — Return to supplier form

**Service, HR & Logistics (5):**
- `work-order.hbs` — Service work order
- `service-report.hbs` — Technician service report
- `payslip.hbs` — Employee payslip
- `delivery-manifest.hbs` — Multi-order delivery manifest
- `packing-slip.hbs` — Warehouse packing list

**CRM & Contracts (4):**
- `contract.hbs` — Service agreement
- `warranty-certificate.hbs` — Product warranty certificate
- `sales-return.hbs` — Customer return authorization
- `refund-receipt.hbs` — Refund acknowledgment

**Admin (3):**
- `price-tag.hbs` — Shelf price tags (A4 sheet layout)
- `audit-report.hbs` — System audit trail report
- `account-confirmation.hbs` — Balance confirmation letter

### Registration Pattern
For each template:
1. Create `.hbs` file in `document-service/src/main/resources/templates/`
2. Add to `DocumentService.TEMPLATE_FILES` map
3. Add to `TemplateService.BUILT_IN_TYPES` list
4. Add `DocumentActionsBar` to the corresponding frontend page

---

## Subsystem 2: QR Codes on Documents

### Approach
Server-side QR code generation using ZXing ("Zebra Crossing") library. QR codes rendered as inline SVG (no external images), injected into templates via the `{{{qrCode}}}` Handlebars placeholder.

### Implementation
- **New dependency:** `com.google.zxing:core` + `com.google.zxing:javase` in document-service pom.xml
- **New file:** `QRCodeGenerator.java` — `generateSvg(String data, int size) → String`
- **Handlebars helper:** Register `{{qrCode}}` as Handlebars helper that calls QRCodeGenerator
- **DocumentService:** Auto-inject QR code data into template context based on document type:
  - Tax invoices → verification URL: `https://letispos.com/verify/{docNumber}`
  - Payment receipts → payment link
  - TRA e-invoices → receipt verification code

### Template Usage
```html
<div class="qr-code">
  <div>Scan to verify</div>
  {{{qrCode}}}
  <div>{{document.number}}</div>
</div>
```

---

## Subsystem 3: Visual Template Editor (Block-Based)

### Approach
Block-based template editor where admins customize layouts by toggling and reordering 7 predefined blocks. Block configuration stored as JSON in `template_overrides.body_html`. Backend compiles JSON config → Handlebars HTML at render time.

### 7 Block Types

| Block | Configurable Properties |
|---|---|
| Header | Logo (upload/URL), company name, TIN, address, phone, email — each toggleable |
| Meta | Document number, date, due date, reference, customer/supplier info — field visibility |
| Items Table | Column toggles (#, description, qty, unit price, tax%, discount, total), drag-to-reorder columns |
| Totals | Subtotal, discount, tax lines, grand total — each toggleable, currency formatting |
| Signature | 1-3 slots with configurable labels (e.g., "Prepared By", "Approved By", "Date") |
| Terms | Rich/plain text terms & conditions, validity period notice |
| Footer | Company info repeat, bank details, page numbers, timestamp — each toggleable |

### JSON Config Format
```json
{
  "blocks": ["header", "meta", "items", "totals", "validity", "signature", "footer"],
  "header": { "showLogo": true, "showTin": true, "showPhone": true },
  "meta": { "showDate": true, "showValidUntil": true, "showPreparedBy": true },
  "items": { "columns": ["#", "name", "qty", "unitPrice", "taxRate", "total"] },
  "totals": { "showSubtotal": true, "showDiscount": true, "showTax": true },
  "signature": { "slots": ["Prepared By", "Customer Acceptance", "Date"] }
}
```

### Frontend
- New page at `/smartpos/settings/templates` — route added to Router.tsx
- **Components:** `TemplateEditorPage.tsx` (main page), `BlockPalette.tsx` (draggable block list), `BlockConfigPanel.tsx` (property editor for selected block), `TemplatePreviewPanel.tsx` (A4 live preview)
- Reuses `TemplatePreviewRenderer.tsx` for preview
- Uses `@dnd-kit/core` for drag-and-drop block reordering (modern, maintained, lightweight)

### Backend Changes
- `TemplateRenderer` extended to detect JSON config vs raw HTML and compile accordingly
- When `body_html` starts with `{`, treat as JSON block config → compile to HTML at render time

---

## Subsystem 4: Document Version History

### Data Model — `document_versions` table

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | — |
| document_id | UUID FK | Links to documents table |
| version_number | INT | Sequential per document |
| storage_path | VARCHAR | MinIO key for this version's PDF |
| change_type | VARCHAR | created, regenerated, reprinted, status_change, sent_email, sent_whatsapp |
| change_summary | VARCHAR | Human-readable description |
| created_by | UUID | Who triggered |
| created_at | TIMESTAMP | When |

### When Versions Are Created
1. First generation → v1, change_type = "created"
2. Regeneration → new version, "regenerated"
3. Status change (sent/paid/cancelled) → "status_change"
4. Reprint (Print/PDF button) → "reprinted"
5. Email/WhatsApp send → "sent_email" / "sent_whatsapp"

### API
- `GET /api/v1/documents/{id}/versions` — list all versions for a document
- `GET /api/v1/documents/{id}/versions/{versionId}/pdf` — download specific version PDF

### Frontend
- `DocumentVersionTimeline.tsx` — vertical timeline component, added as 3rd tab in DocumentPreviewModal
- Shows: version number, date, user, change type badge, "View PDF" button

### Implementation
- Flyway V2 migration for `document_versions` table
- New `DocumentVersion` entity + repository
- `DocumentService` modified to auto-create versions

---

## Subsystem 5: Template Versioning & Rollback

### Data Model — `template_versions` table

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | — |
| template_override_id | UUID FK | Links to template_overrides |
| version_number | INT | Sequential per override |
| body_html | TEXT | Full template at this version |
| change_description | VARCHAR | "Added QR section", "Changed font" |
| updated_by | UUID | Who edited |
| updated_at | TIMESTAMP | When |

### Behavior
- **On save:** Current `body_html` archived to `template_versions` before update applied
- **Rollback:** `POST /api/v1/templates/{type}/rollback {"version": 3}` restores version 3 as active
- **Diff view:** Side-by-side diff between any two versions using a lightweight text diff library

### API
- `GET /api/v1/templates/{type}/versions` — list versions
- `GET /api/v1/templates/{type}/versions/{id}` — get specific version content
- `POST /api/v1/templates/{type}/rollback` — rollback to version

### Frontend
- `TemplateVersionTimeline.tsx` — version history list in template editor
- `VersionDiff.tsx` — side-by-side or unified diff view

### Implementation
- Flyway V3 migration for `template_versions` table
- `TemplateService.saveOverride()` modified to archive before save
- New endpoints in `TemplateController`

---

## Subsystem 6: Bulk Document Generation

### Approach
Async processing using Spring `@Async` with `TaskExecutor` — same pattern as report-service's `ExportJobService`. Users select multiple records, trigger bulk generation, poll for progress, download results as ZIP.

### Data Model — `bulk_jobs` table

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID | Multi-tenant |
| document_type | VARCHAR | e.g., tax-invoice, customer-statement |
| status | VARCHAR | pending, running, completed, failed |
| progress | INT | Documents generated so far |
| total | INT | Total documents to generate |
| results_json | TEXT | JSON array of {referenceId, documentId, storagePath} |
| created_at | TIMESTAMP | — |

### API
- `POST /api/v1/documents/bulk` — submit job: `{documentType, referenceType, referenceIds: [...]}`
- `GET /api/v1/documents/bulk/{jobId}` — poll: `{status, progress, total, results: [...]}`
- `GET /api/v1/documents/bulk/{jobId}/download` — stream ZIP of all PDFs

### Frontend
- `BulkGenerateDialog.tsx` — select document type → confirm → watch progress bar → download
- List pages: add checkbox selection + "Bulk Generate" toolbar button (SalesListPage, PurchasesListPage, PaymentsListPage, CustomersListPage)
- `BulkProgressToast.tsx` — toast notification for in-progress jobs

### Implementation
- Flyway V4 migration for `bulk_jobs` table
- `BulkGenerationService.java` with `@Async` processing
- Spring `TaskExecutor` bean configuration
- `ZipOutputStream` for ZIP creation from MinIO PDFs
- 3 new endpoints in `DocumentController`
- Frontend components + list page modifications

---

## Architecture Summary

All 6 subsystems extend the existing Phase 1 architecture — no new services, no new infrastructure. Everything lives in `document-service` and the existing React frontend.

```
document-service (port 8093)
├── New: QRCodeGenerator.java
├── New: BulkGenerationService.java (@Async)
├── New: DocumentVersion entity + repo
├── New: TemplateVersion entity + repo
├── New: BulkJob entity + repo
├── Modified: DocumentService (versions, QR context)
├── Modified: TemplateService (versioning, JSON config compilation)
├── Modified: TemplateRenderer (JSON block config support)
└── 25 new .hbs templates

Frontend
├── New: TemplateEditorPage.tsx + BlockPalette + BlockConfigPanel + TemplatePreviewPanel
├── New: DocumentVersionTimeline.tsx
├── New: TemplateVersionTimeline.tsx + VersionDiff.tsx
├── New: BulkGenerateDialog.tsx + BulkProgressToast.tsx
└── Modified: DocumentPreviewModal (version timeline tab)
```
