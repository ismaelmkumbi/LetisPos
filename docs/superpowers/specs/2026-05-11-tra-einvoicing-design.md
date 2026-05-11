# TRA E-Invoice Compliance — Design Spec

**Date:** 2026-05-11
**Status:** Approved
**Builds on:** Phase 1-4 (document-service, 34 templates, QR codes, AI layer)

## Overview

Tanzania Revenue Authority (TRA) electronic invoicing compliance. Every tax invoice must be registered with TRA's Virtual Fiscal Device (VFD) system to receive a fiscal code and Z-number before being sent to the customer.

## Architecture

```
document-service → VfdClient (HTTP) → TRA VFD API (stub → real)
     │
     ├── fiscal_code, z_number stored on documents table
     ├── Updated tax-invoice.hbs with TRA-mandated fields
     ├── QR code encodes TRA verification data
     └── Retry queue for failed submissions
```

The TRA VFD API endpoint is built as a stub-first implementation — document-service POSTs to a configurable VFD URL. When TRA sandbox/production credentials are available, just update the URL and auth.

## Backend

### Database — New columns on `documents` table (V7 migration)

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fiscal_code VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS z_number VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS buyer_tin VARCHAR(30);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vfd_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vfd_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vfd_response JSONB;
```

### New: VfdClient

```java
@FeignClient(name = "tra-vfd", url = "${smartpos.tra.vfd-url:http://localhost:9999/vfd}")
public interface VfdClient {
    @PostMapping("/register")
    Map<String, Object> registerInvoice(@RequestBody Map<String, Object> request);

    @GetMapping("/status/{fiscalCode}")
    Map<String, Object> checkStatus(@PathVariable String fiscalCode);
}
```

### New: VfdService

- `registerInvoice(Document doc)` — submits to VFD, stores fiscal_code + z_number + receipt_number
- `checkStatus(Document doc)` — polls VFD for updated status
- `retryFailed()` — scheduled job retrying failed submissions

### Updated: DocumentService.generate()

For documentType = "tax-invoice", after PDF generation, auto-submit to VFD (async, non-blocking — document still generated even if VFD fails).

### Updated: tax-invoice.hbs

Add TRA-mandated fields:
- "Fiscal Code: {{fiscalCode}}"
- "Z-Number: {{zNumber}}"
- "Buyer TIN: {{buyerTin}}"
- "This invoice was electronically generated and is valid without a signature"

### Updated: QR code data

For tax invoices, QR now encodes:
```
TRA|{fiscalCode}|{zNumber}|{receiptNumber}|{sellerTin}|{buyerTin}|{amount}|{date}
```

## Frontend

### Updated: DocumentPreviewModal

Show VFD status badge on tax invoices:
- 🟡 Pending — awaiting submission
- 🟢 Registered — fiscal code received
- 🔴 Failed — submission error with retry button
- ⚪ Not applicable — non-tax documents

### Updated: DocumentActionsBar

For tax invoices, after generation shows VFD status indicator instead of generic status badge.

## Config

```yaml
smartpos:
  tra:
    vfd-url: ${TRA_VFD_URL:http://localhost:9999/vfd}
    vfd-api-key: ${TRA_VFD_API_KEY:stub-key}
    seller-tin: ${TRA_SELLER_TIN:123-456-789}
    vat-registration: ${TRA_VAT_REG:VAT-123456}
    retry-max-attempts: 5
    retry-backoff-seconds: 60
    auto-submit: ${TRA_AUTO_SUBMIT:false}
```

## What It Takes

| Component | Effort |
|---|---|
| V7 migration + Document entity fields | ~0.5 hr |
| VfdClient + VfdService | ~1 day |
| Updated tax-invoice.hbs | ~0.5 hr |
| Updated QR code data | ~0.5 hr |
| Frontend VFD status badge + retry button | ~1 hr |
| Retry scheduler | ~1 hr |
| **Total** | **~2 days** |

## Files

```
BACKEND (new):
- VfdClient.java (Feign client for TRA VFD)
- VfdService.java (submission, status check, retry)
- V7__tra_compliance.sql (new columns)

BACKEND (modified):
- Document.java (new fields)
- DocumentService.java (auto-submit on tax invoice)
- tax-invoice.hbs (TRA fields)
- application.yml (TRA config)

FRONTEND (modified):
- DocumentPreviewModal.tsx (VFD status badge)
- DocumentActionsBar.tsx (retry button for failed VFD)
```
