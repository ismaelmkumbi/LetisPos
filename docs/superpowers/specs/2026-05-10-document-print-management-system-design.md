# Document & Print Management System — Design Spec

**Date:** 2026-05-10
**Status:** Approved

## Overview

A centralized Document & Print Management System for Letis POS that generates professionally branded A4 PDFs and thermal receipts across all business workflows. Powered by a new `document-service` microservice with Gotenberg (Chromium headless) for HTML-to-PDF rendering.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| PDF engine | Gotenberg (Docker) | Pixel-perfect Chromium CSS, industry standard (Odoo), REST API |
| Template language | Handlebars (.hbs) | Logic-light, well-supported in Java, easy for designers to understand |
| Template management | Hybrid — code defaults, DB overrides | Ship fast with great defaults; enable self-service customization later |
| Frontend preview | Hybrid — React instant + Gotenberg verify | Fast editing UX with final fidelity check before sending |
| Architecture | New `document-service` microservice | Single responsibility, clean interface, scales independently |
| PDF storage | MinIO (same as report-service) | Consistent pattern, presigned URLs, S3-compatible |
| Delivery | Delegate to notification-service | Don't duplicate email/WhatsApp infrastructure |

## Architecture

```
Frontend (React)                    Backend Services                    Infrastructure
┌──────────────────┐    REST     ┌──────────────────────┐   REST    ┌──────────────┐
│ DocumentActionsBar│ ─────────→ │  document-service    │ ────────→ │  Gotenberg    │
│ DocumentPreview   │ ←───────── │  (Spring Boot)       │ ←──────── │  (Docker)     │
│ DocumentEmailDlg  │            │                      │           │  :3000        │
│ DocumentWhatsApp  │            │  TemplateEngine      │           └──────────────┘
└──────────────────┘            │  GotenbergClient     │
                                 │  DocumentRepository  │           ┌──────────────┐
                                 │  DeliveryService     │ ────────→ │  MinIO        │
                                 └──────────────────────┘           │  (PDF files)  │
                                       │        ↑                  └──────────────┘
                                       │        │
                               REST call│        │REST call
                                       ↓        │
                                 ┌──────────────────────┐
                                 │  Existing services    │
                                 │  (sales, purchase,    │
                                 │   inventory, payment) │
                                 └──────────────────────┘
```

**Flow:**
1. Existing service calls `POST /api/v1/documents/generate` with document type and reference ID
2. document-service fetches transaction data from the calling service, resolves the template (DB override or code default), and renders HTML via Handlebars
3. HTML is sent to Gotenberg → PDF returned
4. PDF stored in MinIO, metadata in PostgreSQL `documents` table
5. Presigned URL returned to frontend for download, email, or WhatsApp sharing

## Template System

### Resolution Pipeline
1. Check `template_overrides` table for tenant + document_type
2. If active override exists → use it
3. Otherwise → use built-in `.hbs` file from classpath

### Template File Structure
Code defaults live in `document-service/src/main/resources/templates/`:

```
templates/
├── quotation.hbs
├── tax-invoice.hbs
├── proforma-invoice.hbs
├── purchase-order.hbs
├── payment-receipt.hbs
├── credit-note.hbs
├── delivery-note.hbs
├── goods-received.hbs
└── customer-statement.hbs
```

Each `.hbs` file is a self-contained HTML document with inline CSS and Handlebars placeholders. No external stylesheets — this ensures print reliability.

### Existing Systems Coexistence

The new document-service complements, not replaces, existing print functionality:

| Existing Feature | What Happens to It |
|---|---|
| `Receipt.tsx` (thermal 58/80mm) | **Kept as-is.** Thermal receipts use browser `window.print()` — no server round-trip needed at POS. |
| `InvoicePdfGenerator.java` (A4 invoice, sales-service) | **Deprecated.** Replaced by document-service `tax-invoice` template. Remove after Phase 1 validation. |
| `PrintLabelsPage.tsx` (barcode labels) | **Kept as-is.** Label printing uses `window.print()` with CSS grid layouts — Gotenberg adds no value for labels. |
| `PdfExporter.java` (report-service) | **Kept as-is.** Tabular reports are a different concern (data-heavy, landscape, multi-page tables). |

Each `.hbs` file is a self-contained HTML document with inline CSS and Handlebars placeholders. No external stylesheets — this ensures print reliability.

### Database: `template_overrides`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | Multi-tenant scoping |
| document_type | VARCHAR | e.g. quotation, tax-invoice |
| name | VARCHAR | Human-readable label |
| body_html | TEXT | Full Handlebars template with CSS |
| is_active | BOOLEAN | Only active overrides apply |
| version | INT | Optimistic locking |
| updated_by | UUID | Audit |
| updated_at | TIMESTAMP | Audit |

### Database: `documents`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | Multi-tenant |
| document_type | VARCHAR | quotation, tax-invoice, etc. |
| document_number | VARCHAR | Auto-generated, sequential per tenant |
| reference_type | VARCHAR | sale, purchase, payment, etc. |
| reference_id | UUID | FK to source transaction |
| status | VARCHAR | draft, sent, approved, paid, cancelled, expired |
| storage_path | VARCHAR | MinIO object key |
| content_type | VARCHAR | application/pdf |
| size_bytes | BIGINT | File size |
| watermark | VARCHAR | DRAFT, PAID, CANCELLED |
| created_by | UUID | Audit |
| created_at | TIMESTAMP | Audit |

## API Design

### Core Document Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/documents/generate` | Generate PDF, store in MinIO, return metadata |
| GET | `/api/v1/documents/{id}` | Document metadata + presigned download URL |
| GET | `/api/v1/documents/{id}/pdf` | PDF binary or 302 redirect to MinIO |
| POST | `/api/v1/documents/{id}/email` | Send PDF as attachment via notification-service |
| POST | `/api/v1/documents/{id}/whatsapp` | Send PDF link via WhatsApp |
| GET | `/api/v1/documents?type=X&referenceId=Y` | List/search with filters and pagination |

### Template Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/templates` | List available templates (defaults + overrides) |
| GET | `/api/v1/templates/{documentType}` | Resolved template + available placeholders |
| PUT | `/api/v1/templates/{documentType}` | Create/update tenant override |
| DELETE | `/api/v1/templates/{documentType}` | Remove override, fall back to default |
| POST | `/api/v1/templates/{documentType}/preview` | Generate preview PDF with sample data |

## Frontend Components

New shared components in `frontend/src/components/smartpos/documents/`:

| Component | Purpose |
|---|---|
| `DocumentActionsBar.tsx` | Button group: Preview, Print, Download PDF, Email, WhatsApp |
| `DocumentPreviewModal.tsx` | MUI Dialog — React HTML instant preview + "Preview PDF" side |
| `DocumentEmailDialog.tsx` | To, Subject, Message + attachment preview |
| `DocumentWhatsAppDialog.tsx` | Phone number, message, sends PDF link |
| `DocumentStatusBadge.tsx` | Color-coded chip with watermark |
| `TemplatePreviewRenderer.tsx` | Client-side Handlebars renderer for instant preview |

### Integration Pattern
```tsx
<DocumentActionsBar
  documentType="quotation"
  referenceId={sale.id}
  onGenerate={(doc) => showNotification(...)}
/>
```

### Pages Receiving DocumentActionsBar

| Page | Document Types |
|---|---|
| SaleBuilderPage | Quotation, Proforma, Tax Invoice, Delivery Note, Credit Note |
| PosTerminalPage | Payment Receipt (+ existing thermal receipt) |
| PurchaseBuilderPage | Purchase Order, Goods Received Note, Debit Note |
| QuotationsListPage | Quotation (reprint/email from list) |
| SalesListPage | Invoice, Delivery Note, Credit Note (reprint) |
| PurchasesListPage | PO, GRN (reprint) |
| ReturnsPage | Sales Return, Purchase Return |
| StockTransferPage | Stock Transfer Form |
| StockCountPage | Stock Count Sheet |
| PaymentsListPage | Payment Receipt |
| CustomersListPage | Customer Statement |

## Phase 1 Scope

### Included (9 A4 document types)
Quotation, Proforma Invoice, Tax Invoice, Payment Receipt, Purchase Order, Goods Received Note, Customer Statement, Credit Note, Delivery Note

Barcode labels and thermal receipts are already handled by the existing `PrintLabelsPage.tsx` and `Receipt.tsx` via `window.print()` — they are not part of this project.

### Included (actions)
Preview (React + Gotenberg verify), Print A4, Print Thermal (58/80mm), Download PDF, Email PDF, WhatsApp share

### Included (branding)
Company logo, TIN, address, bank details, terms & conditions, status watermarks (Draft, Paid, Cancelled)

### Included (infrastructure)
document-service, Gotenberg Docker sidecar, documents + template_overrides tables, MinIO storage

### Deferred to Phase 2
Visual template designer (drag & drop), QR codes, remaining 20+ document types, bulk generation, document version history, template versioning & rollback

### Deferred to Phase 3
Approval workflows, digital signatures, customer portal, TRA e-invoice compliance, multi-language documents, document search & retrieval

### Deferred to Phase 4
AI template assistant, auto document summarization, smart field mapping, anomaly detection

## Performance Requirements
- PDF generation under 2 seconds
- Gotenberg called synchronously for single documents
- Bulk generation via async queue (Phase 2)

## Security
- All endpoints require authentication via API Gateway
- Presigned MinIO URLs with expiry
- Tenant isolation on all queries
- Audit trail on document creation, email, and WhatsApp delivery
