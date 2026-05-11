# TRA E-Invoice Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement task-by-task.

**Goal:** Add TRA e-invoice compliance with VFD registration stub, fiscal codes, updated tax invoice template, and VFD status tracking.

**Architecture:** New VfdClient (Feign) + VfdService in document-service. New DB columns on documents table. Updated tax-invoice.hbs with TRA fields. Frontend VFD status badge.

**Tech Stack:** Java 21, Spring Cloud OpenFeign, Flyway, React 19, TypeScript, MUI v7

---

### Task 1: Backend — VFD client, service, migration, template update

**Files:**
- Create: `backend/document-service/src/main/resources/db/migration/V7__tra_compliance.sql`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/VfdClient.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/application/VfdService.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/domain/model/Document.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java`
- Modify: `backend/document-service/src/main/resources/templates/tax-invoice.hbs`
- Modify: `backend/document-service/src/main/resources/application.yml`

- [ ] **Step 1: Create V7 migration**

Create `backend/document-service/src/main/resources/db/migration/V7__tra_compliance.sql`:

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fiscal_code VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS z_number VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS buyer_tin VARCHAR(30);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vfd_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vfd_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vfd_response JSONB;
```

- [ ] **Step 2: Add fields to Document entity**

Read `Document.java`. Add fields:
```java
@Column(name = "fiscal_code", length = 50) private String fiscalCode;
@Column(name = "z_number", length = 50) private String zNumber;
@Column(name = "receipt_number", length = 50) private String receiptNumber;
@Column(name = "buyer_tin", length = 30) private String buyerTin;
@Column(name = "vfd_status", length = 20) @Builder.Default private String vfdStatus = "pending";
@Column(name = "vfd_submitted_at") private Instant vfdSubmittedAt;
@Column(name = "vfd_response", columnDefinition = "jsonb") private String vfdResponse;
```

- [ ] **Step 3: Add TRA config to application.yml**

Read `application.yml`. Add under `smartpos:`:
```yaml
  tra:
    vfd-url: ${TRA_VFD_URL:http://localhost:9999/vfd}
    vfd-api-key: ${TRA_VFD_API_KEY:stub-key}
    seller-tin: ${TRA_SELLER_TIN:123-456-789}
    vat-registration: ${TRA_VAT_REG:VAT-123456}
    retry-max-attempts: 5
    retry-backoff-seconds: 60
    auto-submit: ${TRA_AUTO_SUBMIT:false}
```

- [ ] **Step 4: Create VfdClient.java**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/VfdClient.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@FeignClient(name = "tra-vfd", url = "${smartpos.tra.vfd-url}")
public interface VfdClient {
    @PostMapping("/register")
    Map<String, Object> registerInvoice(@RequestBody Map<String, Object> request);

    @GetMapping("/status/{fiscalCode}")
    Map<String, Object> checkStatus(@PathVariable String fiscalCode);
}
```

- [ ] **Step 5: Create VfdService.java**

Create `backend/document-service/src/main/java/io/smartpos/documents/application/VfdService.java`:

```java
package io.smartpos.documents.application;

import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.infrastructure.feign.VfdClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;

@Slf4j @Service @RequiredArgsConstructor
public class VfdService {
    private final VfdClient vfdClient;
    private final DocumentRepository documentRepo;

    @Value("${smartpos.tra.seller-tin:123-456-789}") private String sellerTin;
    @Value("${smartpos.tra.vat-registration:VAT-123456}") private String vatReg;

    public void submitToVfd(Document doc, Map<String, Object> invoiceData) {
        try {
            Map<String, Object> req = Map.of(
                "sellerTin", sellerTin,
                "buyerTin", invoiceData.getOrDefault("buyerTin", ""),
                "invoiceNumber", doc.getDocumentNumber(),
                "invoiceDate", doc.getCreatedAt().toString(),
                "totalAmount", invoiceData.getOrDefault("grandTotal", "0"),
                "vatAmount", invoiceData.getOrDefault("taxAmount", "0"),
                "vatRegistration", vatReg
            );
            Map<String, Object> response = vfdClient.registerInvoice(req);
            doc.setFiscalCode((String) response.getOrDefault("fiscalCode", ""));
            doc.setZNumber((String) response.getOrDefault("zNumber", ""));
            doc.setReceiptNumber((String) response.getOrDefault("receiptNumber", ""));
            doc.setVfdStatus("registered");
            doc.setVfdSubmittedAt(Instant.now());
            doc.setVfdResponse(response.toString());
            documentRepo.save(doc);
            log.info("VFD registered: doc={} fiscal={}", doc.getDocumentNumber(), doc.getFiscalCode());
        } catch (Exception e) {
            log.error("VFD submission failed for doc={}: {}", doc.getDocumentNumber(), e.getMessage());
            doc.setVfdStatus("failed");
            doc.setVfdResponse("{\"error\":\"" + e.getMessage() + "\"}");
            documentRepo.save(doc);
        }
    }

    @Scheduled(fixedDelayString = "${smartpos.tra.retry-backoff-seconds:60}000")
    public void retryFailed() {
        var failed = documentRepo.findByDocumentTypeAndVfdStatus("tax-invoice", "failed");
        if (failed.isEmpty()) return;
        log.info("Retrying {} failed VFD submissions", failed.size());
        failed.forEach(doc -> submitToVfd(doc, Map.of()));
    }
}
```

Add query method to DocumentRepository:
```java
List<Document> findByDocumentTypeAndVfdStatus(String documentType, String vfdStatus);
```

- [ ] **Step 6: Modify DocumentService for auto-submit**

In `DocumentService.generate()`, after document save, add:
```java
if ("tax-invoice".equals(documentType)) {
    vfdService.submitToVfd(saved, contextData);
}
```

Add field: `private final VfdService vfdService;`

- [ ] **Step 7: Update tax-invoice.hbs**

Read the template. After the QR code section, add TRA fields:
```html
<div style="margin-top:16px;padding:10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;color:#555;">
  <div><strong>TRA Fiscal Information</strong></div>
  {{#if fiscalCode}}<div>Fiscal Code: {{fiscalCode}}</div>{{/if}}
  {{#if zNumber}}<div>Z-Number: {{zNumber}}</div>{{/if}}
  {{#if receiptNumber}}<div>Receipt #: {{receiptNumber}}</div>{{/if}}
  <div>Seller TIN: {{sellerTin}}</div>
  {{#if buyerTin}}<div>Buyer TIN: {{buyerTin}}</div>{{/if}}
  <div style="margin-top:4px;font-style:italic;">This invoice was electronically generated via VFD and is valid without a physical signature.</div>
</div>
```

Also update DocumentService to pass TRA fields to template context:
```java
if ("tax-invoice".equals(documentType)) {
    mergedContext.put("fiscalCode", saved.getFiscalCode());
    mergedContext.put("zNumber", saved.getZNumber());
    mergedContext.put("receiptNumber", saved.getReceiptNumber());
    mergedContext.put("sellerTin", sellerTin);
    mergedContext.put("buyerTin", saved.getBuyerTin());
}
```

- [ ] **Step 8: Compile and commit**

```bash
cd backend && mvn compile -pl document-service
git add backend/document-service/
git commit -m "feat: add TRA VFD compliance with stub client, migration, and template"
```

Report compilation status.

---

### Task 2: Frontend — VFD status badge + retry button

**Files:**
- Modify: `frontend/src/components/smartpos/documents/DocumentActionsBar.tsx`
- Modify: `frontend/src/api/smartpos/documents.ts`

- [ ] **Step 1: Add VFD retry API function to documents.ts**

```ts
export async function retryVfdSubmission(id: UUID): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/api/v1/documents/${id}/vfd/retry`);
  return data;
}
```

- [ ] **Step 2: Add VFD retry endpoint to DocumentController**

In `DocumentController.java`, add:
```java
@PostMapping("/{id}/vfd/retry")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Map<String, String>> retryVfd(@PathVariable UUID id) throws Exception {
    Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
        .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
    vfdService.submitToVfd(doc, Map.of());
    return ResponseEntity.ok(Map.of("status", doc.getVfdStatus()));
}
```

- [ ] **Step 3: Update DocumentActionsBar**

Read `DocumentActionsBar.tsx`. After the existing action buttons, add a VFD status indicator for tax invoices:

```tsx
{doc && doc.documentType === 'tax-invoice' && (
  <Chip
    size="small"
    label={doc.vfdStatus === 'registered' ? 'VFD Registered' : doc.vfdStatus === 'failed' ? 'VFD Failed' : 'VFD Pending'}
    color={doc.vfdStatus === 'registered' ? 'success' : doc.vfdStatus === 'failed' ? 'error' : 'warning'}
    variant="outlined"
    sx={{ ml: 1, fontSize: '0.7rem' }}
    onDelete={doc.vfdStatus === 'failed' ? () => handleRetryVfd() : undefined}
    deleteIcon={doc.vfdStatus === 'failed' ? <IconRefresh size={12} /> : undefined}
  />
)}
```

Add handler:
```tsx
const handleRetryVfd = useCallback(async () => {
  if (!doc) return;
  await retryVfdSubmission(doc.id);
}, [doc]);
```

Add imports: `import { Chip } from '@mui/material';`, `import { IconRefresh } from '@tabler/icons-react';`, `import { retryVfdSubmission } from '../../../api/smartpos/documents';`

- [ ] **Step 4: Commit**

```bash
git add frontend/ backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java
git commit -m "feat: add VFD status badge and retry button for tax invoices"
```
