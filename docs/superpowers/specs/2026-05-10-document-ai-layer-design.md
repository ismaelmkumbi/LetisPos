# Document AI Layer — Phase 4 Design Spec

**Date:** 2026-05-10
**Status:** Approved
**Builds on:** Phase 1-3 (document-service, ai-service, 34 templates, search)

## Overview

Add 4 AI-powered features to the Document & Print system by integrating document-service with the existing ai-service (port 8091) via Feign. All AI calls leverage existing LLM providers (Anthropic, OpenAI, DeepSeek) and audit logging infrastructure.

## Architecture

```
document-service (8093) ──Feign──> ai-service (8091) ──HTTP──> LLM (Anthropic/OpenAI)
                                                                │
                                                    ai_invocations (audit table)
```

No new tables, no new services, no new LLM providers. Each feature is: 1 Feign call + 1 endpoint + 1 UI component.

---

## Feature 1: Auto Document Summarization

### Backend
- **New Feign client:** `AiServiceClient.java` in document-service, calling `POST /api/v1/ai/narrate`
- **Modified:** `DocumentService.generate()` — after successful PDF generation, optionally calls AI for summary
- **New endpoint:** `POST /api/v1/documents/{id}/summarize` — triggers summary generation, stores it on the document record
- **New DB column:** `summary VARCHAR(500)` added to `documents` table (nullable)

### Frontend
- **Modified:** `DocumentPreviewModal.tsx` — shows summary banner at top when available (collapsible, with "AI-generated" label)
- **Modified:** `DocumentEmailDialog.tsx` — uses summary as default email body when available
- **Modified:** `DocumentActionsBar.tsx` — shows "Summarize" button if document has no summary yet

---

## Feature 2: Smart Field Mapping

### Backend
- **New endpoint:** `POST /api/v1/documents/field-map` — accepts `{documentType, headers: [...], sampleRows: [[...]]}` → AI returns field-to-column mapping
- Implementation: document-service calls ai-service's `/ai/products/import-map` pattern, adapted for document templates
- Response: `{"mappings": {"customer.name": "header_3", "document.date": "header_1", ...}, "confidence": 0.85}`

### Frontend
- **Modified:** `BulkGenerateDialog.tsx` — when importing from CSV, shows field mapping preview before bulk generation
- **New component:** `FieldMappingPreview.tsx` — shows AI-suggested mappings with accept/reject per field

---

## Feature 3: AI Template Assistant

### Backend
- **New endpoint:** `POST /api/v1/templates/{type}/assist` — accepts `{prompt: "Make header navy with logo right-aligned"}` + current block config → AI returns updated JSON config
- Implementation: ai-service generates structured JSON output (block config update)

### Frontend
- **New component:** `TemplateAssistantChat.tsx` — embedded in TemplateEditorPage as a chat panel
  - Text input + send button
  - Chat history (user prompts + AI responses with config diffs)
  - "Apply" button on each AI response to update the template
- **Modified:** `TemplateEditorPage.tsx` — add assistant panel toggle button, show panel on right side

---

## Feature 4: Document Anomaly Detection

### Backend
- **New endpoint:** `POST /api/v1/documents/{id}/anomalies` — sends document data to ai-service for analysis
- Response: `{anomalies: [{field, severity: "warning"|"critical", message, suggestion}]}`
- Anomaly types detected:
  - Duplicate document numbers
  - Amount > 2x average for this document type
  - Missing required fields (TIN on tax invoices)
  - Future dates
  - Mismatched totals (line items sum != grand total)
  - Unusual status transitions

### Frontend
- **Modified:** `DocumentPreviewModal.tsx` — shows anomaly warnings as an alert banner at top when anomalies detected
- **New component:** `AnomalyBanner.tsx` — warning/critical alerts with expandable detail per anomaly

---

## Implementation Summary

| Feature | Backend | Frontend | Effort |
|---|---|---|---|
| Summarization | Feign client + endpoint + DB column | Summary banner + email body | ~0.5 day |
| Field Mapping | Feign endpoint | Mapping preview UI | ~0.5 day |
| Template Assistant | Feign endpoint | Chat panel in editor | ~1 day |
| Anomaly Detection | Feign endpoint | Warning banner | ~0.5 day |
| **Total** | | | **~2.5 days** |

## Files

```
BACKEND (new):
- AiServiceClient.java (Feign client)
- V6__document_summary.sql (Flyway migration)

BACKEND (modified):
- DocumentService.java (summarize call)
- DocumentController.java (3 new endpoints: summarize, field-map, anomalies)
- TemplateController.java (1 new endpoint: assist)
- application.yml (add ai-service Feign config if missing)

FRONTEND (new):
- TemplateAssistantChat.tsx
- AnomalyBanner.tsx
- FieldMappingPreview.tsx

FRONTEND (modified):
- DocumentPreviewModal.tsx (summary + anomaly banners)
- DocumentEmailDialog.tsx (summary as default body)
- DocumentActionsBar.tsx (Summarize button)
- TemplateEditorPage.tsx (assistant panel)
- BulkGenerateDialog.tsx (field mapping step)
```
