# Document & Print Management System — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Document & Print system with 25 new document templates, QR codes, a block-based visual template editor, document version history, template versioning with rollback, and bulk document generation — all extending the existing Phase 1 document-service and frontend.

**Architecture:** All 6 subsystems extend the existing `document-service` (port 8093) and React frontend. No new services or infrastructure. New features: ZXing QR code library, block-based JSON template config, `@Async` bulk generation, version history tables, and `@dnd-kit/core` for drag-and-drop.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Flyway, Handlebars.java, ZXing 3.5+, MinIO, React 19, TypeScript, MUI v7, @dnd-kit/core

---

## File Structure

```
BACKEND (new files)
document-service/src/main/resources/templates/
├── [25 new .hbs template files — see Subsystem 1]

document-service/src/main/java/io/smartpos/documents/
├── infrastructure/qr/
│   └── QRCodeGenerator.java              # ZXing SVG QR code generation
├── domain/model/
│   ├── DocumentVersion.java              # JPA entity for document_versions
│   ├── TemplateVersion.java              # JPA entity for template_versions
│   └── BulkJob.java                      # JPA entity for bulk_jobs
├── domain/repository/
│   ├── DocumentVersionRepository.java
│   ├── TemplateVersionRepository.java
│   └── BulkJobRepository.java
├── application/
│   ├── BulkGenerationService.java        # @Async bulk generation
│   └── TemplateCompiler.java            # JSON config → Handlebars HTML
├── api/dto/
│   ├── BulkJobDto.java
│   ├── BulkGenerateRequest.java
│   ├── VersionDto.java
│   └── TemplateVersionDto.java
├── infrastructure/config/
│   └── AsyncConfig.java                  # TaskExecutor for bulk jobs

BACKEND (modified files)
├── document-service/pom.xml              # Add ZXing dependencies
├── DocumentService.java                  # QR context injection, version creation
├── TemplateService.java                  # Archive before save, rollback, JSON compile
├── TemplateRenderer.java                 # JSON block config detection
├── DocumentController.java               # Version history + bulk endpoints
├── TemplateController.java               # Version history + rollback endpoints
├── HandlebarsConfig.java                 # Register {{qrCode}} helper

BACKEND (new migrations)
├── db/migration/V2__document_versions.sql
├── db/migration/V3__template_versions.sql
├── db/migration/V4__bulk_jobs.sql

FRONTEND (new files)
├── src/api/smartpos/documents.ts         # Add version/bulk API functions
├── src/components/smartpos/documents/
│   ├── DocumentVersionTimeline.tsx        # Version history timeline
│   ├── TemplateVersionTimeline.tsx        # Template version history
│   ├── VersionDiff.tsx                    # Side-by-side diff view
│   ├── BulkGenerateDialog.tsx             # Bulk generation dialog
│   └── BulkProgressToast.tsx              # Progress toast for bulk jobs
├── src/views/smartpos/settings/
│   └── TemplateEditorPage.tsx             # Main template editor page
├── src/components/smartpos/documents/editor/
│   ├── BlockPalette.tsx                   # Draggable block list
│   ├── BlockConfigPanel.tsx               # Block property editor
│   └── TemplatePreviewPanel.tsx           # A4 live preview panel

FRONTEND (modified files)
├── src/api/smartpos/documents.ts          # New API functions
├── src/components/smartpos/documents/DocumentPreviewModal.tsx  # Add version tab
├── src/routes/Router.tsx                  # Add template editor route
└── [List pages]                           # Add bulk selection checkboxes + button
```

---

## Subsystem 1: 25 New Document Templates

### Task 1: Stock & Inventory templates (5 files)

**Files:**
- Create: `backend/document-service/src/main/resources/templates/stock-transfer.hbs`
- Create: `backend/document-service/src/main/resources/templates/stock-count.hbs`
- Create: `backend/document-service/src/main/resources/templates/stock-adjustment.hbs`
- Create: `backend/document-service/src/main/resources/templates/batch-traceability.hbs`
- Create: `backend/document-service/src/main/resources/templates/expiry-report.hbs`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java` (add 5 entries to TEMPLATE_FILES)
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateService.java` (add 5 entries to BUILT_IN_TYPES)

- [ ] **Step 1: Create stock-transfer.hbs**

Create `backend/document-service/src/main/resources/templates/stock-transfer.hbs`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #7c3aed; padding-bottom: 16px; }
  .logo { font-size: 24px; font-weight: 700; color: #7c3aed; }
  .company-info { text-align: right; font-size: 11px; color: #555; line-height: 1.5; }
  .doc-title { font-size: 22px; font-weight: 700; color: #7c3aed; margin-bottom: 4px; }
  .doc-meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .meta-box { flex: 1; }
  .meta-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 2px; }
  .meta-value { font-size: 13px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .text-right { text-align: right; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 10px; color: #888; line-height: 1.6; }
  .signature { display: flex; justify-content: space-between; margin-top: 50px; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #1a1a1a; width: 200px; margin-bottom: 6px; }
  .sig-label { font-size: 11px; color: #555; }
  .warehouse-box { display: flex; gap: 24px; margin-bottom: 24px; }
  .wh-from, .wh-to { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
  .wh-label { font-size: 10px; text-transform: uppercase; color: #7c3aed; letter-spacing: 1px; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">{{company.name}}</div>
    <div style="font-size:11px;color:#555;">{{company.address}}</div>
    <div style="font-size:11px;color:#555;">TIN: {{company.tin}}</div>
  </div>
  <div class="company-info">
    <div>{{company.phone}}</div>
    <div>{{company.email}}</div>
  </div>
</div>
<div class="doc-title">STOCK TRANSFER</div>
<div class="doc-meta">
  <div class="meta-box"><div class="meta-label">Transfer #</div><div class="meta-value">{{document.number}}</div></div>
  <div class="meta-box"><div class="meta-label">Date</div><div class="meta-value">{{document.date}}</div></div>
  <div class="meta-box"><div class="meta-label">Status</div><div class="meta-value">{{document.status}}</div></div>
</div>
<div class="warehouse-box">
  <div class="wh-from"><div class="wh-label">From Warehouse</div><div style="font-size:13px;font-weight:500;">{{fromWarehouse.name}}</div><div style="font-size:11px;color:#555;">{{fromWarehouse.address}}</div></div>
  <div class="wh-to"><div class="wh-label">To Warehouse</div><div style="font-size:13px;font-weight:500;">{{toWarehouse.name}}</div><div style="font-size:11px;color:#555;">{{toWarehouse.address}}</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Product / SKU</th><th class="text-right">Qty</th><th>Unit</th><th>Batch</th><th class="text-right">Unit Cost</th><th class="text-right">Total Cost</th></tr></thead>
  <tbody>
    {{#each items}}<tr><td>{{inc @index}}</td><td><strong>{{name}}</strong><br><span style="font-size:10px;color:#888;">SKU: {{sku}}</span></td><td class="text-right">{{quantity}}</td><td>{{unit}}</td><td>{{batch}}</td><td class="text-right">{{unitCost}}</td><td class="text-right"><strong>{{totalCost}}</strong></td></tr>{{/each}}
  </tbody>
</table>
<div style="margin-left:auto;width:280px;">
  <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;"><span>Total Items</span><span>{{totals.itemCount}}</span></div>
  <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;"><span>Total Quantity</span><span>{{totals.totalQty}}</span></div>
  <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid #7c3aed;font-size:16px;font-weight:700;color:#7c3aed;padding-top:10px;margin-top:4px;"><span>Total Cost</span><span>{{totals.totalCost}}</span></div>
</div>
<div class="signature">
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Prepared By</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Approved By</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Received By</div></div>
</div>
<div class="footer">
  <div>{{company.name}} | {{company.address}} | TIN: {{company.tin}}</div>
  <div>Phone: {{company.phone}} | Email: {{company.email}}</div>
  <div>Page 1 of 1 | Generated on {{document.date}}</div>
</div>
</body>
</html>
```

- [ ] **Step 2: Create remaining 4 stock/inventory templates**

Create each file adapting the quotation.hbs pattern from Phase 1 with document-specific headers and fields:

- `stock-count.hbs` — Title "STOCK COUNT SHEET", warehouse info, table with columns: #, Product, SKU, Expected Qty, Actual Qty, Difference, Status. Signature: Counted By, Checked By.
- `stock-adjustment.hbs` — Title "STOCK ADJUSTMENT", reason dropdown area, table: #, Product, SKU, Current Qty, Adjusted Qty, Difference, Reason. Authorization signature block.
- `batch-traceability.hbs` — Title "BATCH TRACEABILITY REPORT", product/batch filter area, table: Date, Reference, Batch#, In Qty, Out Qty, Balance, Location.
- `expiry-report.hbs` — Title "EXPIRY REPORT", date range filter, table: Product, SKU, Batch#, Expiry Date, Days Left, Qty, Location. Red highlight for expired items.

- [ ] **Step 3: Register all 5 templates in DocumentService**

In `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java`, add to TEMPLATE_FILES map:

```java
private static final Map<String, String> TEMPLATE_FILES = Map.of(
    // ... existing 9 entries ...
    "stock-transfer", "stock-transfer.hbs",
    "stock-count", "stock-count.hbs",
    "stock-adjustment", "stock-adjustment.hbs",
    "batch-traceability", "batch-traceability.hbs",
    "expiry-report", "expiry-report.hbs"
);
```

- [ ] **Step 4: Register all 5 in TemplateService.BUILT_IN_TYPES**

```java
private static final List<String> BUILT_IN_TYPES = List.of(
    // ... existing 9 entries ...
    "stock-transfer", "stock-count", "stock-adjustment",
    "batch-traceability", "expiry-report"
);
```

- [ ] **Step 5: Compile and commit**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

```bash
git add backend/document-service/src/main/resources/templates/stock-transfer.hbs backend/document-service/src/main/resources/templates/stock-count.hbs backend/document-service/src/main/resources/templates/stock-adjustment.hbs backend/document-service/src/main/resources/templates/batch-traceability.hbs backend/document-service/src/main/resources/templates/expiry-report.hbs backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java backend/document-service/src/main/java/io/smartpos/documents/application/TemplateService.java
git commit -m "feat: add 5 stock and inventory document templates"
```

### Task 2: Accounting & Finance templates (5 files)

**Files:**
- Create: `backend/document-service/src/main/resources/templates/journal-voucher.hbs`
- Create: `backend/document-service/src/main/resources/templates/payment-voucher.hbs`
- Create: `backend/document-service/src/main/resources/templates/receipt-voucher.hbs`
- Create: `backend/document-service/src/main/resources/templates/expense-voucher.hbs`
- Create: `backend/document-service/src/main/resources/templates/debit-note.hbs`
- Modify: DocumentService.java TEMPLATE_FILES + TemplateService.java BUILT_IN_TYPES

- [ ] **Step 1: Create all 5 accounting templates**

Adapt the quotation.hbs pattern. Key differences per template:

- `journal-voucher.hbs` — Title "JOURNAL VOUCHER", double-entry table: Account, Description, Debit, Credit. Totals must balance. Approval signature.
- `payment-voucher.hbs` — Title "PAYMENT VOUCHER", payee info, payment method, table: Invoice#, Description, Amount. Total paid. Signature: Prepared, Approved, Received By.
- `receipt-voucher.hbs` — Title "RECEIPT VOUCHER", received from, payment method, table: Invoice#, Description, Amount. Total received. Official stamp area.
- `expense-voucher.hbs` — Title "EXPENSE VOUCHER", claimant info, expense date, category dropdown, table: Item, Description, Amount, Receipt Attached (Y/N). Total claimed. Signature: Claimant, Approved By.
- `debit-note.hbs` — Title "DEBIT NOTE" (red theme), supplier info, original invoice reference, table: Product, Qty, Unit Price, Total. Reason for debit.

Each template: self-contained HTML, inline CSS, @page A4 directive, Handlebars placeholders, consistent header/footer. Use the standard CSS classes from quotation.hbs.

- [ ] **Step 2: Register in DocumentService.TEMPLATE_FILES and TemplateService.BUILT_IN_TYPES**

- [ ] **Step 3: Compile and commit**

```bash
git add backend/document-service/src/main/resources/templates/journal-voucher.hbs backend/document-service/src/main/resources/templates/payment-voucher.hbs backend/document-service/src/main/resources/templates/receipt-voucher.hbs backend/document-service/src/main/resources/templates/expense-voucher.hbs backend/document-service/src/main/resources/templates/debit-note.hbs backend/document-service/src/main/java/io/smartpos/documents/application/
git commit -m "feat: add 5 accounting and finance document templates"
```

### Task 3: Purchasing + Service/HR/Logistics + CRM/Contracts + Admin templates (15 files)

**Files:**
- Create: 15 .hbs files across 4 categories (see below)
- Modify: DocumentService.java + TemplateService.java

- [ ] **Step 1: Create Purchasing templates (3 files)**

- `supplier-rfq.hbs` — Title "REQUEST FOR QUOTATION", supplier info, table: Item, Description, Qty, Specifications. Delivery deadline. Response by date.
- `supplier-invoice.hbs` — Title "SUPPLIER INVOICE", supplier info, PO reference, table: Product, Qty, Unit Price, Tax%, Total. Bank details for payment.
- `purchase-return.hbs` — Title "PURCHASE RETURN", original PO reference, supplier info, reason for return, table: Product, Qty Ordered, Qty Returned, Unit Price, Total Credit.

- [ ] **Step 2: Create Service/HR/Logistics templates (5 files)**

- `work-order.hbs` — Title "WORK ORDER", customer info, equipment details, issue description, assigned technician, scheduled date, estimated hours, parts required table.
- `service-report.hbs` — Title "SERVICE REPORT", work order reference, technician name, date of service, work performed, parts used table, recommendations. Signature: Technician, Customer.
- `payslip.hbs` — Title "PAYSLIP", employee info (name, ID, department, position), pay period, earnings table (basic salary, allowances, overtime, bonus), deductions table (tax, pension, insurance, loans), net pay. Confidential notice.
- `delivery-manifest.hbs` — Title "DELIVERY MANIFEST", driver/carrier info, route/vehicle info, table: Order#, Customer, Address, Items, Qty, Status. Signature: Driver, Warehouse Manager.
- `packing-slip.hbs` — Title "PACKING SLIP", order reference, ship to address, table: Item#, Product, Qty Ordered, Qty Picked, Qty Packed. Checked by area. No prices (packing slip convention).

- [ ] **Step 3: Create CRM/Contracts templates (4 files)**

- `contract.hbs` — Title "SERVICE AGREEMENT", parties (company + customer), contract period, service description, pricing section, payment terms, termination clause, governing law. Signature: Both parties + witnesses.
- `warranty-certificate.hbs` — Title "WARRANTY CERTIFICATE", product info (model, serial#), purchase date, warranty period, coverage details, exclusions, claim procedure. Official stamp.
- `sales-return.hbs` — Title "SALES RETURN", original invoice reference, customer info, reason for return, table: Product, Qty Sold, Qty Returned, Unit Price, Refund Amount. Authorization signature.
- `refund-receipt.hbs` — Title "REFUND RECEIPT", customer info, original payment reference, refund method, refund amount, reason. Official stamp.

- [ ] **Step 4: Create Admin templates (3 files)**

- `price-tag.hbs` — Title "PRICE TAGS" (no title, grid layout), CSS grid with 10-12 tags per A4 sheet. Each tag: product name, barcode placeholder, price, valid until date. Dashed cut lines between tags.
- `audit-report.hbs` — Title "AUDIT TRAIL REPORT", date range, filter criteria, table: Timestamp, User, Action, Entity Type, Entity ID, Details. Page numbers.
- `account-confirmation.hbs` — Title "BALANCE CONFIRMATION", customer info, statement date, opening balance, closing balance. "Please confirm the above balance" letter format. Reply section.

- [ ] **Step 5: Register all 15 in DocumentService.TEMPLATE_FILES + TemplateService.BUILT_IN_TYPES**

- [ ] **Step 6: Compile and commit**

```bash
git add backend/document-service/src/main/resources/templates/ backend/document-service/src/main/java/io/smartpos/documents/application/
git commit -m "feat: add 15 document templates (purchasing, service, CRM, admin)"
```

---

## Subsystem 2: QR Codes on Documents

### Task 4: Add ZXing dependency and QR code generator

**Files:**
- Modify: `backend/document-service/pom.xml`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/qr/QRCodeGenerator.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/HandlebarsConfig.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java`

- [ ] **Step 1: Add ZXing dependencies to pom.xml**

In `backend/document-service/pom.xml`, add after the handlebars dependency:

```xml
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.5.3</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>javase</artifactId>
    <version>3.5.3</version>
</dependency>
```

- [ ] **Step 2: Create QRCodeGenerator.java**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/qr/QRCodeGenerator.java`:

```java
package io.smartpos.documents.infrastructure.qr;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;
import java.util.EnumMap;
import java.util.Map;

@Component
public class QRCodeGenerator {

    public String generateSvg(String data, int size) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 1);

        var matrix = writer.encode(data, BarcodeFormat.QR_CODE, size, size, hints);
        return toSvg(matrix, size);
    }

    private String toSvg(com.google.zxing.common.BitMatrix matrix, int size) throws Exception {
        var doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
        var svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", String.valueOf(size));
        svg.setAttribute("height", String.valueOf(size));
        svg.setAttribute("viewBox", "0 0 " + size + " " + size);
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        var rect = doc.createElement("rect");
        rect.setAttribute("width", "100%");
        rect.setAttribute("height", "100%");
        rect.setAttribute("fill", "white");
        svg.appendChild(rect);

        var group = doc.createElement("g");
        group.setAttribute("fill", "black");

        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                if (matrix.get(x, y)) {
                    var rect2 = doc.createElement("rect");
                    rect2.setAttribute("x", String.valueOf(x));
                    rect2.setAttribute("y", String.valueOf(y));
                    rect2.setAttribute("width", "1");
                    rect2.setAttribute("height", "1");
                    group.appendChild(rect2);
                }
            }
        }

        svg.appendChild(group);
        doc.appendChild(svg);

        var transformer = TransformerFactory.newInstance().newTransformer();
        var writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));
        return writer.toString();
    }
}
```

- [ ] **Step 3: Register {{qrCode}} Handlebars helper**

In `HandlebarsConfig.java`, add after the `inc` helper registration:

```java
hbs.registerHelper("qrCode", (context, options) -> {
    try {
        // The QR data is passed via the template context as "qrData"
        Object qrData = options.context.get("qrData");
        String data = qrData != null ? qrData.toString() : "";
        if (data.isEmpty()) return "";
        QRCodeGenerator qr = new QRCodeGenerator();
        return qr.generateSvg(data, 150);
    } catch (Exception e) {
        return "<!-- QR error: " + e.getMessage() + " -->";
    }
});
```

Add import: `import io.smartpos.documents.infrastructure.qr.QRCodeGenerator;`

- [ ] **Step 4: Auto-inject QR data in DocumentService.generate()**

In `DocumentService.java`, add QR data to context before rendering:

```java
// After contextData.putIfAbsent("company", ...)
String qrData = buildQrData(documentType, referenceType, referenceId);
mergedContext.put("qrData", qrData);
```

Add method:
```java
private String buildQrData(String documentType, String referenceType, UUID referenceId) {
    return switch (documentType) {
        case "tax-invoice", "proforma-invoice" ->
            "https://letispos.com/verify/" + referenceType + "/" + referenceId;
        case "payment-receipt" ->
            "https://pay.letispos.com/" + referenceType + "/" + referenceId;
        default -> "";
    };
}
```

- [ ] **Step 5: Add QR section to tax-invoice.hbs**

In `tax-invoice.hbs`, add before the footer:

```html
<div class="qr-code" style="text-align:right;margin-top:20px;">
  <div style="display:inline-block;text-align:center;">
    {{{qrCode}}}
    <div style="font-size:9px;color:#888;margin-top:4px;">Scan to verify this invoice</div>
    <div style="font-size:10px;font-weight:500;">{{document.number}}</div>
  </div>
</div>
```

- [ ] **Step 6: Compile and commit**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

```bash
git add backend/document-service/pom.xml backend/document-service/src/main/java/io/smartpos/documents/infrastructure/qr/ backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/HandlebarsConfig.java backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java backend/document-service/src/main/resources/templates/tax-invoice.hbs
git commit -m "feat: add QR code generation with ZXing and template integration"
```

---

## Subsystem 3: Visual Template Editor

### Task 5: Backend — JSON block config compiler

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateCompiler.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/TemplateRenderer.java`

- [ ] **Step 1: Create TemplateCompiler.java**

Create `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateCompiler.java`:

```java
package io.smartpos.documents.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class TemplateCompiler {

    private static final ObjectMapper mapper = new ObjectMapper();

    public String compile(String bodyHtml) {
        if (bodyHtml == null || bodyHtml.isBlank()) return "";
        String trimmed = bodyHtml.trim();
        if (!trimmed.startsWith("{")) {
            return bodyHtml; // Already raw HTML, not block config
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> config = mapper.readValue(trimmed, Map.class);
            return compileBlocks(config);
        } catch (Exception e) {
            return bodyHtml; // Fallback: treat as raw HTML
        }
    }

    @SuppressWarnings("unchecked")
    private String compileBlocks(Map<String, Object> config) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><style>");
        html.append("@page{size:A4;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}");
        html.append("body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#1a1a1a}");
        html.append(".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #2563eb;padding-bottom:16px}");
        html.append(".company-info{text-align:right;font-size:11px;color:#555;line-height:1.5}");
        html.append(".doc-title{font-size:22px;font-weight:700;color:#2563eb;margin-bottom:4px}");
        html.append(".doc-meta{display:flex;justify-content:space-between;margin-bottom:24px}");
        html.append(".meta-box{flex:1}.meta-label{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:2px}");
        html.append(".meta-value{font-size:13px;font-weight:500}");
        html.append("table{width:100%;border-collapse:collapse;margin-bottom:24px}");
        html.append("thead th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:2px solid #e2e8f0}");
        html.append("tbody td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}");
        html.append(".text-right{text-align:right}");
        html.append(".totals{margin-left:auto;width:280px}");
        html.append(".total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}");
        html.append(".total-row.grand{border-top:2px solid #2563eb;font-size:16px;font-weight:700;color:#2563eb;padding-top:10px;margin-top:4px}");
        html.append(".footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:10px;color:#888;line-height:1.6}");
        html.append(".signature{display:flex;justify-content:space-between;margin-top:50px}");
        html.append(".sig-block{text-align:center}");
        html.append(".sig-line{border-bottom:1px solid #1a1a1a;width:200px;margin-bottom:6px}");
        html.append(".sig-label{font-size:11px;color:#555}");
        html.append("</style></head><body>");

        List<String> blocks = (List<String>) config.getOrDefault("blocks", List.of());
        for (String block : blocks) {
            Map<String, Object> blockConfig = (Map<String, Object>) config.getOrDefault(block, Map.of());
            html.append(compileBlock(block, blockConfig));
        }

        html.append("</body></html>");
        return html.toString();
    }

    @SuppressWarnings("unchecked")
    private String compileBlock(String block, Map<String, Object> cfg) {
        return switch (block) {
            case "header" -> compileHeaderBlock(cfg);
            case "meta" -> compileMetaBlock(cfg);
            case "items" -> compileItemsBlock(cfg);
            case "totals" -> compileTotalsBlock(cfg);
            case "signature" -> compileSignatureBlock(cfg);
            case "terms" -> compileTermsBlock(cfg);
            case "footer" -> compileFooterBlock(cfg);
            default -> "";
        };
    }

    private String compileHeaderBlock(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"header\">");
        sb.append("<div>");
        if (booleanValue(cfg, "showLogo", true))
            sb.append("<div class=\"logo\">{{company.name}}</div>");
        if (booleanValue(cfg, "showAddress", true))
            sb.append("<div style=\"font-size:11px;color:#555;\">{{company.address}}</div>");
        if (booleanValue(cfg, "showTin", true))
            sb.append("<div style=\"font-size:11px;color:#555;\">TIN: {{company.tin}}</div>");
        sb.append("</div>");
        sb.append("<div class=\"company-info\">");
        if (booleanValue(cfg, "showPhone", true))
            sb.append("<div>{{company.phone}}</div>");
        if (booleanValue(cfg, "showEmail", true))
            sb.append("<div>{{company.email}}</div>");
        sb.append("</div></div>");
        return sb.toString();
    }

    private String compileMetaBlock(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"doc-title\">").append(cfg.getOrDefault("title", "DOCUMENT")).append("</div>");
        sb.append("<div class=\"doc-meta\">");
        if (booleanValue(cfg, "showNumber", true))
            sb.append("<div class=\"meta-box\"><div class=\"meta-label\">").append(cfg.getOrDefault("numberLabel", "Document #")).append("</div><div class=\"meta-value\">{{document.number}}</div></div>");
        if (booleanValue(cfg, "showDate", true))
            sb.append("<div class=\"meta-box\"><div class=\"meta-label\">Date</div><div class=\"meta-value\">{{document.date}}</div></div>");
        if (booleanValue(cfg, "showDueDate", false))
            sb.append("<div class=\"meta-box\"><div class=\"meta-label\">Due Date</div><div class=\"meta-value\">{{document.dueDate}}</div></div>");
        sb.append("</div>");
        if (booleanValue(cfg, "showCustomer", true)) {
            sb.append("<div class=\"doc-meta\"><div class=\"meta-box\"><div class=\"meta-label\">Customer</div><div class=\"meta-value\">{{customer.name}}</div><div style=\"font-size:11px;color:#555;\">{{customer.address}}</div></div></div>");
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String compileItemsBlock(Map<String, Object> cfg) {
        List<String> columns = (List<String>) cfg.getOrDefault("columns",
            List.of("#", "name", "qty", "unitPrice", "total"));
        StringBuilder sb = new StringBuilder();
        sb.append("<table><thead><tr>");
        for (String col : columns) {
            String label = switch (col) {
                case "#" -> "#"; case "name" -> "Item / Description";
                case "description" -> "Description"; case "qty" -> "Qty";
                case "unitPrice" -> "Unit Price"; case "taxRate" -> "Tax %";
                case "tax" -> "Tax"; case "discount" -> "Discount";
                case "total" -> "Total"; case "sku" -> "SKU";
                default -> col;
            };
            String width = col.equals("name") || col.equals("description") ? "" : "120px";
            String cls = List.of("#", "name", "description").contains(col) ? "" : "class=\"text-right\"";
            sb.append("<th style=\"width:").append(width).append(";\" ").append(cls).append(">").append(label).append("</th>");
        }
        sb.append("</tr></thead><tbody>");
        sb.append("{{#each items}}<tr>");
        for (String col : columns) {
            String cls = List.of("#", "name", "description").contains(col) ? "" : " class=\"text-right\"";
            sb.append("<td").append(cls).append(">");
            if (col.equals("#")) sb.append("{{inc @index}}");
            else if (col.equals("name")) sb.append("<strong>{{name}}</strong>{{#if description}}<br><span style=\"font-size:10px;color:#888;\">{{description}}</span>{{/if}}");
            else sb.append("{{").append(col).append("}}");
            sb.append("</td>");
        }
        sb.append("</tr>{{/each}}");
        sb.append("</tbody></table>");
        return sb.toString();
    }

    private String compileTotalsBlock(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"totals\">");
        if (booleanValue(cfg, "showSubtotal", true))
            sb.append("<div class=\"total-row\"><span>Subtotal</span><span>{{totals.subtotal}}</span></div>");
        if (booleanValue(cfg, "showDiscount", false))
            sb.append("{{#if totals.discount}}<div class=\"total-row\"><span>Discount</span><span>-{{totals.discount}}</span></div>{{/if}}");
        if (booleanValue(cfg, "showTax", true))
            sb.append("{{#each totals.taxLines}}<div class=\"total-row\"><span>{{label}}</span><span>{{amount}}</span></div>{{/each}}");
        sb.append("<div class=\"total-row grand\"><span>Grand Total</span><span>{{totals.grandTotal}}</span></div>");
        sb.append("</div>");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String compileSignatureBlock(Map<String, Object> cfg) {
        List<String> slots = (List<String>) cfg.getOrDefault("slots",
            List.of("Prepared By", "Approved By", "Date"));
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"signature\">");
        for (String slot : slots) {
            sb.append("<div class=\"sig-block\"><div class=\"sig-line\"></div><div class=\"sig-label\">").append(slot).append("</div></div>");
        }
        sb.append("</div>");
        return sb.toString();
    }

    private String compileTermsBlock(Map<String, Object> cfg) {
        if (!booleanValue(cfg, "showTerms", false)) return "";
        return "{{#if terms}}<div style=\"margin-top:20px;\"><h4 style=\"font-size:11px;margin-bottom:6px;\">Terms & Conditions</h4><p style=\"font-size:10px;color:#666;\">{{terms}}</p></div>{{/if}}";
    }

    private String compileFooterBlock(Map<String, Object> cfg) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"footer\">");
        if (booleanValue(cfg, "showCompany", true))
            sb.append("<div>{{company.name}} | {{company.address}} | TIN: {{company.tin}}</div>");
        if (booleanValue(cfg, "showContact", true))
            sb.append("<div>Phone: {{company.phone}} | Email: {{company.email}}</div>");
        if (booleanValue(cfg, "showPageNumbers", true))
            sb.append("<div>Page 1 of 1 | Generated on {{document.date}}</div>");
        sb.append("</div>");
        return sb.toString();
    }

    private boolean booleanValue(Map<String, Object> cfg, String key, boolean defaultVal) {
        Object v = cfg.get(key);
        if (v instanceof Boolean b) return b;
        return defaultVal;
    }
}
```

- [ ] **Step 2: Modify TemplateRenderer to use TemplateCompiler**

In `TemplateRenderer.java`, inject `TemplateCompiler` and use it:

```java
@Component
@RequiredArgsConstructor
public class TemplateRenderer {
    private final Handlebars handlebars;
    private final TemplateCompiler compiler;

    public String render(String templateContent, Map<String, Object> context) throws IOException {
        String html = compiler.compile(templateContent);
        Template template = handlebars.compileInline(html);
        return template.apply(context);
    }
}
```

- [ ] **Step 3: Compile and commit**

Run: `cd backend && mvn compile -pl document-service`

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/application/TemplateCompiler.java backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/TemplateRenderer.java
git commit -m "feat: add JSON block config template compiler"
```

### Task 6: Frontend — Template Editor page and components

**Files:**
- Create: `frontend/src/views/smartpos/settings/TemplateEditorPage.tsx`
- Create: `frontend/src/components/smartpos/documents/editor/BlockPalette.tsx`
- Create: `frontend/src/components/smartpos/documents/editor/BlockConfigPanel.tsx`
- Create: `frontend/src/components/smartpos/documents/editor/TemplatePreviewPanel.tsx`
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Install @dnd-kit/core**

Run: `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Create BlockPalette.tsx**

Create `frontend/src/components/smartpos/documents/editor/BlockPalette.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, IconButton } from '@mui/material';
import { IconGripVertical, IconSettings } from '@tabler/icons-react';

interface BlockPaletteProps {
  blockId: string;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function BlockPalette({ blockId, label, isSelected, onSelect }: BlockPaletteProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: blockId });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        mb: 1,
        border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
        borderRadius: 2,
        background: isSelected ? '#f0f4ff' : '#fff',
        cursor: 'grab',
        transform: CSS.Transform.toString(transform),
        transition,
        '&:hover': { borderColor: '#4f46e5' },
      }}
      onClick={onSelect}
    >
      <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: 'grab' }}>
        <IconGripVertical size={14} />
      </IconButton>
      <Typography sx={{ flex: 1, fontSize: '0.8rem', fontWeight: 500 }}>{label}</Typography>
      <IconSettings size={14} color={isSelected ? '#4f46e5' : '#888'} />
    </Box>
  );
}
```

- [ ] **Step 3: Create BlockConfigPanel.tsx**

Create `frontend/src/components/smartpos/documents/editor/BlockConfigPanel.tsx`:

```tsx
import { Box, Typography, Switch, FormControlLabel, TextField, Chip } from '@mui/material';

interface BlockConfigPanelProps {
  blockId: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const blockMeta: Record<string, { label: string; toggles: Record<string, string> }> = {
  header: {
    label: 'Header Block',
    toggles: { showLogo: 'Company Name', showAddress: 'Address', showTin: 'TIN', showPhone: 'Phone', showEmail: 'Email' },
  },
  meta: {
    label: 'Meta Block',
    toggles: { showNumber: 'Document Number', showDate: 'Date', showDueDate: 'Due Date', showCustomer: 'Customer Info' },
  },
  items: {
    label: 'Items Table Block',
    toggles: {},
  },
  totals: {
    label: 'Totals Block',
    toggles: { showSubtotal: 'Subtotal', showDiscount: 'Discount', showTax: 'Tax Lines' },
  },
  signature: {
    label: 'Signature Block',
    toggles: {},
  },
  terms: {
    label: 'Terms Block',
    toggles: { showTerms: 'Show Terms & Conditions' },
  },
  footer: {
    label: 'Footer Block',
    toggles: { showCompany: 'Company Info', showContact: 'Contact Info', showPageNumbers: 'Page Numbers' },
  },
};

export default function BlockConfigPanel({ blockId, config, onChange }: BlockConfigPanelProps) {
  const meta = blockMeta[blockId];
  if (!meta) return <Typography color="text.secondary">Select a block to configure</Typography>;

  const handleToggle = (key: string) => (_: unknown, checked: boolean) => {
    onChange({ ...config, [key]: checked });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#4f46e5' }}>{meta.label}</Typography>
      {Object.entries(meta.toggles).map(([key, label]) => (
        <FormControlLabel
          key={key}
          control={<Switch size="small" checked={config[key] !== false} onChange={handleToggle(key)} />}
          label={<Typography sx={{ fontSize: '0.8rem' }}>{label}</Typography>}
          sx={{ display: 'flex', mb: 0.5 }}
        />
      ))}
      {blockId === 'signature' && (
        <TextField
          label="Signature labels (comma-separated)"
          fullWidth
          size="small"
          margin="dense"
          defaultValue={(config.slots as string[])?.join(', ') ?? 'Prepared By, Approved By, Date'}
          onBlur={(e) => onChange({ ...config, slots: e.target.value.split(',').map(s => s.trim()) })}
        />
      )}
      {blockId === 'items' && (
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 0.5 }}>Columns (click to toggle)</Typography>
          {['#', 'name', 'description', 'qty', 'unitPrice', 'taxRate', 'discount', 'total'].map(col => (
            <Chip
              key={col}
              label={col}
              size="small"
              variant={(config.columns as string[])?.includes(col) !== false ? 'filled' : 'outlined'}
              sx={{ m: 0.25 }}
              onClick={() => {
                const cols = (config.columns as string[]) ?? ['#', 'name', 'qty', 'unitPrice', 'total'];
                const idx = cols.indexOf(col);
                if (idx >= 0) onChange({ ...config, columns: cols.filter(c => c !== col) });
                else onChange({ ...config, columns: [...cols, col] });
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Create TemplatePreviewPanel.tsx**

Create `frontend/src/components/smartpos/documents/editor/TemplatePreviewPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { getTemplate, previewTemplate } from '../../../../api/smartpos/documents';

interface TemplatePreviewPanelProps {
  documentType: string;
  config: Record<string, unknown>;
}

export default function TemplatePreviewPanel({ documentType, config }: TemplatePreviewPanelProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPdfUrl(null);
  }, [config]);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const configJson = JSON.stringify({ blocks: config.blocks || [], ...config });
      const blob = await previewTemplate(documentType, configJson);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error('Preview failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <button onClick={handlePreview} disabled={loading} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' }}>
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Refresh Preview'}
        </button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {pdfUrl ? (
          <iframe src={pdfUrl} style={{ width: '100%', height: 700, border: 'none' }} title="Template Preview" />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500, color: '#888', fontSize: '0.9rem' }}>
            Click "Refresh Preview" to see changes
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 5: Create TemplateEditorPage.tsx**

Create `frontend/src/views/smartpos/settings/TemplateEditorPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { listTemplates, getTemplate, saveTemplateOverride } from '../../../api/smartpos/documents';
import BlockPalette from '../../../components/smartpos/documents/editor/BlockPalette';
import BlockConfigPanel from '../../../components/smartpos/documents/editor/BlockConfigPanel';
import TemplatePreviewPanel from '../../../components/smartpos/documents/editor/TemplatePreviewPanel';

const defaultConfig: Record<string, unknown> = {
  blocks: ['header', 'meta', 'items', 'totals', 'signature', 'footer'],
  header: { showLogo: true, showAddress: true, showTin: true, showPhone: true, showEmail: true },
  meta: { showNumber: true, showDate: true, showDueDate: false, showCustomer: true },
  items: { columns: ['#', 'name', 'qty', 'unitPrice', 'taxRate', 'total'] },
  totals: { showSubtotal: true, showDiscount: true, showTax: true },
  signature: { slots: ['Prepared By', 'Customer Acceptance', 'Date'] },
  footer: { showCompany: true, showContact: true, showPageNumbers: true },
};

export default function TemplateEditorPage() {
  const [docType, setDocType] = useState('quotation');
  const [config, setConfig] = useState<Record<string, unknown>>(defaultConfig);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    getTemplate(docType).then(t => {
      try {
        const parsed = JSON.parse(t.bodyHtml);
        if (parsed.blocks) setConfig(parsed);
      } catch { setConfig(defaultConfig); }
    }).catch(() => setConfig(defaultConfig));
  }, [docType]);

  const handleDragEnd = useCallback((event: { active: { id: string }; over: { id: string } | null }) => {
    if (!event.over || event.active.id === event.over.id) return;
    const blocks = (config.blocks as string[]) ?? [];
    const oldIdx = blocks.indexOf(event.active.id);
    const newIdx = blocks.indexOf(event.over.id);
    setConfig({ ...config, blocks: arrayMove(blocks, oldIdx, newIdx) });
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTemplateOverride(docType, JSON.stringify(config), `${docType} template`);
    } catch (e) { console.error('Save failed', e); }
    finally { setSaving(false); }
  };

  const blocks = (config.blocks as string[]) ?? [];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Template Editor</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Document Type</InputLabel>
            <Select value={docType} label="Document Type" onChange={e => setDocType(e.target.value)}>
              {['quotation', 'tax-invoice', 'proforma-invoice', 'purchase-order', 'payment-receipt', 'credit-note', 'delivery-note', 'goods-received', 'customer-statement'].map(t => (
                <MenuItem key={t} value={t}>{t.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Block Palette */}
        <Box sx={{ width: 250, border: '1px solid #e2e8f0', borderRadius: 2, p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Blocks</Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
              {blocks.map(block => (
                <BlockPalette
                  key={block}
                  blockId={block}
                  label={
                    { header: 'Header', meta: 'Meta', items: 'Items Table', totals: 'Totals', signature: 'Signature', terms: 'Terms', footer: 'Footer' }[block] ?? block
                  }
                  isSelected={selectedBlock === block}
                  onSelect={() => setSelectedBlock(block)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Box>

        {/* Block Config */}
        <Box sx={{ width: 280, border: '1px solid #e2e8f0', borderRadius: 2 }}>
          {selectedBlock && (
            <BlockConfigPanel
              blockId={selectedBlock}
              config={(config[selectedBlock] as Record<string, unknown>) ?? {}}
              onChange={(newCfg) => setConfig({ ...config, [selectedBlock!]: newCfg })}
            />
          )}
        </Box>

        {/* Preview */}
        <Box sx={{ flex: 1, border: '2px solid #4f46e5', borderRadius: 2 }}>
          <TemplatePreviewPanel documentType={docType} config={config} />
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 6: Add route for template editor**

In `frontend/src/routes/Router.tsx`, add under the `/smartpos` children:

```tsx
{ path: 'settings/templates', element: <Loadable component={lazy(() => import('src/views/smartpos/settings/TemplateEditorPage'))} /> },
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/smartpos/settings/TemplateEditorPage.tsx frontend/src/components/smartpos/documents/editor/ frontend/src/routes/Router.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add visual template editor with drag-and-drop blocks"
```

---

## Subsystem 4: Document Version History

### Task 7: Backend — document_versions table, entity, and API

**Files:**
- Create: `backend/document-service/src/main/resources/db/migration/V2__document_versions.sql`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/model/DocumentVersion.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/DocumentVersionRepository.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java`

- [ ] **Step 1: Create V2 migration**

Create `backend/document-service/src/main/resources/db/migration/V2__document_versions.sql`:

```sql
CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id),
    version_number  INT NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    change_type     VARCHAR(30) NOT NULL DEFAULT 'created',
    change_summary  VARCHAR(500),
    created_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_number)
);

CREATE INDEX idx_doc_versions_document ON document_versions (document_id);
```

- [ ] **Step 2: Create DocumentVersion entity**

Create `backend/document-service/src/main/java/io/smartpos/documents/domain/model/DocumentVersion.java`:

```java
package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_versions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "version_number"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DocumentVersion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "change_type", nullable = false, length = 30)
    @Builder.Default
    private String changeType = "created";

    @Column(name = "change_summary", length = 500)
    private String changeSummary;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 3: Create DocumentVersionRepository**

```java
package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(UUID documentId);
    int countByDocumentId(UUID documentId);
}
```

- [ ] **Step 4: Modify DocumentService to create versions**

In `DocumentService.java`, add the repository dependency and modify `generate()` to create v1:

```java
private final DocumentVersionRepository versionRepo;

// In generate(), after documentRepo.save(doc):
DocumentVersion v1 = DocumentVersion.builder()
    .documentId(saved.getId())
    .versionNumber(1)
    .storagePath(saved.getStoragePath())
    .changeType("created")
    .changeSummary("Document generated")
    .build();
versionRepo.save(v1);
```

Add `downloadByPath` method for version/bulk download access:

```java
public byte[] downloadByPath(String storagePath) throws Exception {
    return storage.download(storagePath);
}
```

Add a public method to create a new version on reprint/regenerate:
```java
public DocumentVersion createVersion(Document doc, String changeType, String summary) throws Exception {
    int nextVersion = versionRepo.countByDocumentId(doc.getId()) + 1;
    DocumentVersion version = DocumentVersion.builder()
        .documentId(doc.getId())
        .versionNumber(nextVersion)
        .storagePath(doc.getStoragePath())
        .changeType(changeType)
        .changeSummary(summary)
        .build();
    return versionRepo.save(version);
}
```

- [ ] **Step 5: Add version endpoints to DocumentController**

```java
private final DocumentVersionRepository versionRepo;

@GetMapping("/{id}/versions")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<List<DocumentVersion>> listVersions(@PathVariable UUID id) {
    return ResponseEntity.ok(versionRepo.findByDocumentIdOrderByVersionNumberDesc(id));
}

@GetMapping("/{id}/versions/{versionId}/pdf")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<byte[]> downloadVersionPdf(@PathVariable UUID id, @PathVariable UUID versionId) throws Exception {
    DocumentVersion version = versionRepo.findById(versionId)
        .orElseThrow(() -> new IllegalArgumentException("Version not found: " + versionId));
    byte[] pdfBytes = documentService.downloadByPath(version.getStoragePath());
    return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).body(pdfBytes);
}
```

- [ ] **Step 6: Compile and commit**

```bash
git add backend/document-service/src/main/resources/db/migration/V2__document_versions.sql backend/document-service/src/main/java/io/smartpos/documents/domain/model/DocumentVersion.java backend/document-service/src/main/java/io/smartpos/documents/domain/repository/DocumentVersionRepository.java backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java
git commit -m "feat: add document version history with versions table and API"
```

### Task 8: Frontend — DocumentVersionTimeline component

**Files:**
- Create: `frontend/src/components/smartpos/documents/DocumentVersionTimeline.tsx`
- Modify: `frontend/src/components/smartpos/documents/DocumentPreviewModal.tsx`
- Modify: `frontend/src/api/smartpos/documents.ts`

- [ ] **Step 1: Add version API functions to documents.ts**

```ts
export interface DocumentVersion {
  id: UUID;
  documentId: UUID;
  versionNumber: number;
  storagePath: string;
  changeType: string;
  changeSummary?: string;
  createdBy?: UUID;
  createdAt: string;
}

export async function listDocumentVersions(id: UUID): Promise<DocumentVersion[]> {
  const { data } = await api.get<DocumentVersion[]>(`/api/v1/documents/${id}/versions`);
  return data;
}

export async function downloadVersionPdf(documentId: UUID, versionId: UUID): Promise<Blob> {
  const response = await api.get<Blob>(`/api/v1/documents/${documentId}/versions/${versionId}/pdf`, { responseType: 'blob' });
  return response.data;
}
```

- [ ] **Step 2: Create DocumentVersionTimeline.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent } from '@mui/material';
import { IconFileTypePdf, IconFileCheck, IconPrinter, IconMail, IconBrandWhatsapp, IconRefresh } from '@tabler/icons-react';
import { listDocumentVersions, downloadVersionPdf, type DocumentVersion } from '../../../api/smartpos/documents';

const changeIcons: Record<string, React.ReactNode> = {
  created: <IconFileCheck size={14} />,
  regenerated: <IconRefresh size={14} />,
  reprinted: <IconPrinter size={14} />,
  status_change: <IconFileCheck size={14} />,
  sent_email: <IconMail size={14} />,
  sent_whatsapp: <IconBrandWhatsapp size={14} />,
};

const changeColors: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
  created: 'success', regenerated: 'info', reprinted: 'primary',
  status_change: 'warning', sent_email: 'primary', sent_whatsapp: 'success',
};

export default function DocumentVersionTimeline({ documentId }: { documentId: string }) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocumentVersions(documentId).then(setVersions).finally(() => setLoading(false));
  }, [documentId]);

  const handleViewPdf = async (version: DocumentVersion) => {
    const blob = await downloadVersionPdf(documentId, version.id);
    window.open(URL.createObjectURL(blob));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Timeline sx={{ mt: 0 }}>
      {versions.map(v => (
        <TimelineItem key={v.id}>
          <TimelineSeparator>
            <TimelineDot color={changeColors[v.changeType] ?? 'grey'}>{changeIcons[v.changeType]}</TimelineDot>
            {v.versionNumber > 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="body2" fontWeight={600} textTransform="capitalize">{v.changeType.replace('_', ' ')}</Typography>
            {v.changeSummary && <Typography variant="caption" color="text.secondary">{v.changeSummary}</Typography>}
            <Typography variant="caption" color="text.secondary" display="block">
              v{v.versionNumber} — {new Date(v.createdAt).toLocaleString()}
            </Typography>
            <Button size="small" onClick={() => handleViewPdf(v)} startIcon={<IconFileTypePdf size={14} />} sx={{ mt: 0.5 }}>
              View PDF
            </Button>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
```

- [ ] **Step 3: Add version tab to DocumentPreviewModal**

In `DocumentPreviewModal.tsx`, add a third tab "Versions":

```tsx
import DocumentVersionTimeline from './DocumentVersionTimeline';

// Add a Tab:
<Tab label="Versions" icon={<IconHistory size={16} />} iconPosition="start" />
import { IconHistory } from '@tabler/icons-react';

// In DialogContent, add:
{!loading && !error && tab === 2 && docId && (
  <DocumentVersionTimeline documentId={docId} />
)}
```

Note: `docId` needs to be passed as a prop to DocumentPreviewModal, or derived from the document. Add `documentId?: string` to DocumentPreviewModalProps and pass it from DocumentActionsBar.

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add document version timeline component and API"
```

---

## Subsystem 5: Template Versioning & Rollback

### Task 9: Backend — template_versions table, entity, rollback API

**Files:**
- Create: `backend/document-service/src/main/resources/db/migration/V3__template_versions.sql`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/model/TemplateVersion.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/TemplateVersionRepository.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateService.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/api/TemplateController.java`

- [ ] **Step 1: Create V3 migration**

```sql
CREATE TABLE template_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_override_id UUID NOT NULL REFERENCES template_overrides(id),
    version_number      INT NOT NULL,
    body_html           TEXT NOT NULL,
    change_description  VARCHAR(300),
    updated_by          UUID,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (template_override_id, version_number)
);

CREATE INDEX idx_tpl_versions_override ON template_versions (template_override_id);
```

- [ ] **Step 2: Create TemplateVersion entity**

```java
package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "template_versions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"template_override_id", "version_number"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TemplateVersion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "template_override_id", nullable = false)
    private UUID templateOverrideId;
    @Column(name = "version_number", nullable = false)
    private int versionNumber;
    @Column(name = "body_html", nullable = false, columnDefinition = "TEXT")
    private String bodyHtml;
    @Column(name = "change_description", length = 300)
    private String changeDescription;
    @Column(name = "updated_by")
    private UUID updatedBy;
    @Column(name = "updated_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
```

- [ ] **Step 3: Create TemplateVersionRepository**

```java
package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.TemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TemplateVersionRepository extends JpaRepository<TemplateVersion, UUID> {
    List<TemplateVersion> findByTemplateOverrideIdOrderByVersionNumberDesc(UUID templateOverrideId);
    int countByTemplateOverrideId(UUID templateOverrideId);
}
```

- [ ] **Step 4: Modify TemplateService.saveOverride() to archive**

Inject `TemplateVersionRepository`. In `saveOverride()`, before calling `overrideRepo.save(override)`:

```java
// Archive current version before saving
if (override.getId() != null) {
    int nextVersion = templateVersionRepo.countByTemplateOverrideId(override.getId()) + 1;
    TemplateVersion archived = TemplateVersion.builder()
        .templateOverrideId(override.getId())
        .versionNumber(nextVersion)
        .bodyHtml(override.getBodyHtml())
        .changeDescription("Template updated")
        .build();
    templateVersionRepo.save(archived);
}
```

Add rollback method:
```java
@Transactional
public void rollback(String documentType, int targetVersion) {
    UUID tenantId = TenantContext.require();
    TemplateOverride override = overrideRepo
        .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType)
        .orElseThrow(() -> new IllegalArgumentException("No active override for: " + documentType));

    TemplateVersion version = templateVersionRepo
        .findByTemplateOverrideIdOrderByVersionNumberDesc(override.getId())
        .stream()
        .filter(v -> v.getVersionNumber() == targetVersion)
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Version not found: " + targetVersion));

    override.setBodyHtml(version.getBodyHtml());
    override.setUpdatedAt(Instant.now());
    overrideRepo.save(override);
}
```

- [ ] **Step 5: Add rollback and version endpoints to TemplateController**

```java
@GetMapping("/{documentType}/versions")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<List<TemplateVersion>> listVersions(@PathVariable String documentType) {
    UUID tenantId = TenantContext.require();
    var override = templateOverrideRepo
        .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType);
    if (override.isEmpty()) return ResponseEntity.ok(List.of());
    return ResponseEntity.ok(templateVersionRepo
        .findByTemplateOverrideIdOrderByVersionNumberDesc(override.get().getId()));
}

@PostMapping("/{documentType}/rollback")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Map<String, String>> rollback(@PathVariable String documentType,
                                                     @RequestBody Map<String, Integer> body) {
    int version = body.getOrDefault("version", 0);
    if (version <= 0) return ResponseEntity.badRequest().body(Map.of("error", "version is required"));
    templateService.rollback(documentType, version);
    return ResponseEntity.ok(Map.of("status", "rolled back to version " + version));
}
```

- [ ] **Step 6: Compile and commit**

```bash
git add backend/document-service/
git commit -m "feat: add template versioning with archive-on-save and rollback"
```

### Task 10: Frontend — version history and diff components

**Files:**
- Create: `frontend/src/components/smartpos/documents/TemplateVersionTimeline.tsx`
- Create: `frontend/src/components/smartpos/documents/VersionDiff.tsx`
- Modify: `frontend/src/api/smartpos/documents.ts`

- [ ] **Step 1: Add template version API functions to documents.ts**

```ts
export interface TemplateVersionDto {
  id: UUID;
  templateOverrideId: UUID;
  versionNumber: number;
  bodyHtml: string;
  changeDescription?: string;
  updatedBy?: UUID;
  updatedAt: string;
}

export async function listTemplateVersions(documentType: string): Promise<TemplateVersionDto[]> {
  const { data } = await api.get<TemplateVersionDto[]>(`/api/v1/templates/${documentType}/versions`);
  return data;
}

export async function rollbackTemplate(documentType: string, version: number): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/api/v1/templates/${documentType}/rollback`, { version });
  return data;
}
```

- [ ] **Step 2: Create TemplateVersionTimeline.tsx**

A simple list component showing template version history with rollback buttons:

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { IconRotateClockwise } from '@tabler/icons-react';
import { listTemplateVersions, rollbackTemplate, type TemplateVersionDto } from '../../../api/smartpos/documents';

export default function TemplateVersionTimeline({ documentType, onRollback }: { documentType: string; onRollback: () => void }) {
  const [versions, setVersions] = useState<TemplateVersionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<number | null>(null);

  useEffect(() => {
    listTemplateVersions(documentType).then(setVersions).finally(() => setLoading(false));
  }, [documentType]);

  const handleRollback = async (version: number) => {
    setRolling(version);
    await rollbackTemplate(documentType, version);
    setRolling(null);
    onRollback();
  };

  if (loading) return <CircularProgress />;

  return (
    <List dense>
      {versions.map(v => (
        <ListItem key={v.id} secondaryAction={
          <Button size="small" onClick={() => handleRollback(v.versionNumber)} disabled={rolling === v.versionNumber}
            startIcon={rolling === v.versionNumber ? <CircularProgress size={12} /> : <IconRotateClockwise size={14} />}>
            Restore
          </Button>
        }>
          <ListItemText
            primary={`v${v.versionNumber} — ${v.changeDescription ?? 'Update'}`}
            secondary={new Date(v.updatedAt).toLocaleString()}
          />
        </ListItem>
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: add template version timeline and rollback UI"
```

---

## Subsystem 6: Bulk Document Generation

### Task 11: Backend — bulk_jobs table, async service, and API

**Files:**
- Create: `backend/document-service/src/main/resources/db/migration/V4__bulk_jobs.sql`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/model/BulkJob.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/BulkJobRepository.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/application/BulkGenerationService.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/AsyncConfig.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/dto/BulkJobDto.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/dto/BulkGenerateRequest.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`

- [ ] **Step 1: Create V4 migration**

```sql
CREATE TABLE bulk_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    document_type   VARCHAR(50) NOT NULL,
    reference_type  VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress        INT NOT NULL DEFAULT 0,
    total           INT NOT NULL DEFAULT 0,
    results_json    TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulk_jobs_tenant ON bulk_jobs (tenant_id);
```

- [ ] **Step 2: Create BulkJob entity and repository**

```java
package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bulk_jobs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BulkJob {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "document_type", nullable = false, length = 50) private String documentType;
    @Column(name = "reference_type", nullable = false, length = 50) private String referenceType;
    @Column(length = 20) @Builder.Default private String status = "pending";
    @Builder.Default private int progress = 0;
    @Builder.Default private int total = 0;
    @Column(name = "results_json", columnDefinition = "TEXT") private String resultsJson;
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default private Instant createdAt = Instant.now();
}
```

```java
package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.BulkJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BulkJobRepository extends JpaRepository<BulkJob, UUID> {}
```

- [ ] **Step 3: Create AsyncConfig**

```java
package io.smartpos.documents.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean(name = "bulkGenerationExecutor")
    public ThreadPoolTaskExecutor bulkExecutor() {
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("bulk-gen-");
        return executor;
    }
}
```

- [ ] **Step 4: Create BulkGenerateRequest DTO**

```java
package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class BulkGenerateRequest {
    @NotBlank private String documentType;
    @NotBlank private String referenceType;
    @NotEmpty private List<UUID> referenceIds;
}
```

- [ ] **Step 5: Create BulkJobDto**

```java
package io.smartpos.documents.api.dto;

import io.smartpos.documents.domain.model.BulkJob;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data @Builder
public class BulkJobDto {
    private UUID id;
    private String status;
    private int progress;
    private int total;
    private List<Map<String, Object>> results;
    private Instant createdAt;

    public static BulkJobDto from(BulkJob job) {
        return BulkJobDto.builder()
            .id(job.getId()).status(job.getStatus())
            .progress(job.getProgress()).total(job.getTotal())
            .createdAt(job.getCreatedAt()).build();
    }
}
```

- [ ] **Step 6: Create BulkGenerationService**

```java
package io.smartpos.documents.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.documents.domain.model.BulkJob;
import io.smartpos.documents.domain.repository.BulkJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class BulkGenerationService {

    private final BulkJobRepository jobRepo;
    private final DocumentService documentService;

    @Async("bulkGenerationExecutor")
    @Transactional
    public CompletableFuture<Void> process(BulkJob job, List<UUID> referenceIds) {
        UUID tenantId = job.getTenantId();
        TenantContext.set(tenantId);
        List<Map<String, Object>> results = new ArrayList<>();

        try {
            job.setStatus("running");
            job.setTotal(referenceIds.size());
            jobRepo.save(job);

            for (int i = 0; i < referenceIds.size(); i++) {
                try {
                    var doc = documentService.generate(
                        job.getDocumentType(), job.getReferenceType(),
                        referenceIds.get(i), Map.of());
                    results.add(Map.of(
                        "referenceId", referenceIds.get(i).toString(),
                        "documentId", doc.getId().toString(),
                        "documentNumber", doc.getDocumentNumber(),
                        "status", "success"
                    ));
                } catch (Exception e) {
                    results.add(Map.of(
                        "referenceId", referenceIds.get(i).toString(),
                        "status", "failed",
                        "error", e.getMessage()
                    ));
                }
                job.setProgress(i + 1);
                job.setResultsJson(toJson(results));
                jobRepo.save(job);
            }
            job.setStatus("completed");
        } catch (Exception e) {
            log.error("Bulk generation failed for job {}", job.getId(), e);
            job.setStatus("failed");
        }

        jobRepo.save(job);
        TenantContext.clear();
        return CompletableFuture.completedFuture(null);
    }

    private String toJson(List<Map<String, Object>> results) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(results);
        } catch (Exception e) { return "[]"; }
    }
}
```

- [ ] **Step 7: Add bulk endpoints to DocumentController**

```java
private final BulkGenerationService bulkService;
private final BulkJobRepository bulkJobRepo;

@PostMapping("/bulk")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<BulkJobDto> bulkGenerate(@Valid @RequestBody BulkGenerateRequest req) {
    UUID tenantId = TenantContext.require();
    BulkJob job = BulkJob.builder()
        .tenantId(tenantId)
        .documentType(req.getDocumentType())
        .referenceType(req.getReferenceType())
        .status("pending")
        .total(req.getReferenceIds().size())
        .build();
    job = bulkJobRepo.save(job);
    bulkService.process(job, req.getReferenceIds());
    return ResponseEntity.status(HttpStatus.ACCEPTED).body(BulkJobDto.from(job));
}

@GetMapping("/bulk/{jobId}")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<BulkJobDto> bulkJobStatus(@PathVariable UUID jobId) {
    BulkJob job = bulkJobRepo.findById(jobId)
        .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
    return ResponseEntity.ok(BulkJobDto.from(job));
}

@GetMapping("/bulk/{jobId}/download")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<byte[]> bulkJobDownload(@PathVariable UUID jobId) throws Exception {
    BulkJob job = bulkJobRepo.findById(jobId)
        .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
    if (!"completed".equals(job.getStatus())) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(null);
    }
    // Create ZIP of all generated PDFs
    var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> results = mapper.readValue(job.getResultsJson(), List.class);
    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
    try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(baos)) {
        for (var r : results) {
            if (!"success".equals(r.get("status"))) continue;
            UUID docId = UUID.fromString((String) r.get("documentId"));
            var doc = documentRepo.findById(docId).orElse(null);
            if (doc == null) continue;
            byte[] pdfBytes = documentService.downloadByPath(doc.getStoragePath());
            java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry((String) r.get("documentNumber") + ".pdf");
            zos.putNextEntry(entry);
            zos.write(pdfBytes);
            zos.closeEntry();
        }
    }
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"documents.zip\"")
        .body(baos.toByteArray());
}
```

- [ ] **Step 8: Compile and commit**

```bash
git add backend/document-service/
git commit -m "feat: add bulk document generation with async jobs and ZIP download"
```

### Task 12: Frontend — BulkGenerateDialog and list page checkboxes

**Files:**
- Create: `frontend/src/components/smartpos/documents/BulkGenerateDialog.tsx`
- Modify: `frontend/src/api/smartpos/documents.ts`
- Modify: List pages (SalesListPage, PurchasesListPage, PaymentsListPage, CustomersListPage)

- [ ] **Step 1: Add bulk API functions to documents.ts**

```ts
export interface BulkGenerateRequest {
  documentType: string;
  referenceType: string;
  referenceIds: UUID[];
}

export interface BulkJobDto {
  id: UUID;
  status: string;
  progress: number;
  total: number;
  results?: Array<{ referenceId: UUID; documentId: UUID; documentNumber: string; status: string }>;
  createdAt: string;
}

export async function bulkGenerate(req: BulkGenerateRequest): Promise<BulkJobDto> {
  const { data } = await api.post<BulkJobDto>('/api/v1/documents/bulk', req);
  return data;
}

export async function getBulkJobStatus(jobId: UUID): Promise<BulkJobDto> {
  const { data } = await api.get<BulkJobDto>(`/api/v1/documents/bulk/${jobId}`);
  return data;
}

export async function downloadBulkJob(jobId: UUID): Promise<Blob> {
  const response = await api.get<Blob>(`/api/v1/documents/bulk/${jobId}/download`, { responseType: 'blob' });
  return response.data;
}
```

- [ ] **Step 2: Create BulkGenerateDialog.tsx**

A dialog that:
1. Shows document type selector
2. Confirms number of selected records
3. Submits bulk job
4. Polls progress (every 2 seconds)
5. Shows progress bar
6. Provides Download ZIP button when complete

```tsx
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, LinearProgress, Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { IconFileDownload } from '@tabler/icons-react';
import { bulkGenerate, getBulkJobStatus, downloadBulkJob, type BulkJobDto } from '../../../api/smartpos/documents';

interface BulkGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  referenceType: string;
  referenceIds: string[];
}

export default function BulkGenerateDialog({ open, onClose, referenceType, referenceIds }: BulkGenerateDialogProps) {
  const [docType, setDocType] = useState('tax-invoice');
  const [job, setJob] = useState<BulkJobDto | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const docTypesByRef: Record<string, { value: string; label: string }[]> = {
    sale: [{ value: 'tax-invoice', label: 'Tax Invoice' }, { value: 'delivery-note', label: 'Delivery Note' }],
    purchase: [{ value: 'purchase-order', label: 'Purchase Order' }],
    payment: [{ value: 'payment-receipt', label: 'Payment Receipt' }],
    customer: [{ value: 'customer-statement', label: 'Customer Statement' }],
  };

  const handleStart = async () => {
    const result = await bulkGenerate({ documentType: docType, referenceType, referenceIds });
    setJob(result);
    pollRef.current = setInterval(async () => {
      const updated = await getBulkJobStatus(result.id);
      setJob(updated);
      if (updated.status === 'completed' || updated.status === 'failed') {
        clearInterval(pollRef.current);
      }
    }, 2000);
  };

  const handleDownload = async () => {
    if (!job) return;
    setDownloading(true);
    const blob = await downloadBulkJob(job.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'documents.zip'; a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const types = docTypesByRef[referenceType] ?? [{ value: 'tax-invoice', label: 'Tax Invoice' }];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Generate Documents</DialogTitle>
      <DialogContent>
        {!job ? (
          <>
            <Typography sx={{ mb: 2 }}>
              Generate documents for <strong>{referenceIds.length}</strong> selected {referenceType} records.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Document Type</InputLabel>
              <Select value={docType} label="Document Type" onChange={e => setDocType(e.target.value)}>
                {types.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
          </>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{job.status === 'running' ? 'Generating...' : job.status === 'completed' ? 'Complete!' : 'Failed'}</Typography>
              <Typography variant="body2" color="text.secondary">{job.progress} / {job.total}</Typography>
            </Box>
            <LinearProgress variant={job.status === 'running' ? 'determinate' : 'determinate'}
              value={job.total > 0 ? (job.progress / job.total) * 100 : 0}
              color={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'primary'} />
            {job.status === 'completed' && (
              <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleDownload} disabled={downloading}
                startIcon={<IconFileDownload size={16} />}>
                {downloading ? 'Downloading...' : 'Download ZIP'}
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{job?.status === 'completed' ? 'Close' : 'Cancel'}</Button>
        {!job && <Button variant="contained" onClick={handleStart} disabled={referenceIds.length === 0}>Generate</Button>}
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add checkbox selection and Bulk Generate button to list pages**

On each list page (SalesListPage, PurchasesListPage, PaymentsListPage, CustomersListPage), add:

```tsx
import { useState } from 'react';
import { Button, Checkbox } from '@mui/material';
import { IconFileStack } from '@tabler/icons-react';
import BulkGenerateDialog from 'src/components/smartpos/documents/BulkGenerateDialog';

// Inside the page component:
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [bulkOpen, setBulkOpen] = useState(false);

// Add Checkbox column to DataTable or EnhancedDataTable
// Add a "Bulk Generate" button in the toolbar:
<Button onClick={() => setBulkOpen(true)} disabled={selectedIds.length === 0}
  startIcon={<IconFileStack size={16} />}>Bulk Generate</Button>

// At end of component:
<BulkGenerateDialog open={bulkOpen} onClose={() => setBulkOpen(false)}
  referenceType="sale" referenceIds={selectedIds} />
```

Use the correct `referenceType` per page: `"sale"` for SalesListPage, `"purchase"` for PurchasesListPage, `"payment"` for PaymentsListPage, `"customer"` for CustomersListPage.

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add bulk document generation dialog and list page integration"
```

---

## Build & Deployment Notes

No new infrastructure needed. All changes are within `document-service` and the existing React frontend. Dependencies added:
- `com.google.zxing:core:3.5.3` — QR code generation
- `com.google.zxing:javase:3.5.3` — QR code SVG output
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — drag-and-drop for template editor

### Verification
```bash
# Backend
cd backend && mvn test -pl document-service
# Frontend
cd frontend && npx tsc --noEmit  # type check
cd frontend && npx vite build     # production build
```
