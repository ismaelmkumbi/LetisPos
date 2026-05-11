# Document Search & Retrieval — Design Spec

**Date:** 2026-05-10
**Status:** Approved
**Builds on:** Phase 1 + Phase 2 (document-service, 34 templates, version history, bulk generation)

## Overview

A metadata search and retrieval system for all generated documents. Users search by document number, type, customer/supplier, date range, amount range, status, and reference type. Results are displayed in a paginated, sortable table with quick actions (Preview, Download, Print, Email).

## Approach

Metadata-only search — queries the existing `documents` table via PostgreSQL with a composite index. No full-text PDF search, no new infrastructure.

## Backend

### API Endpoint

`GET /api/v1/documents/search` with query parameters:

| Parameter | Type | Description |
|---|---|---|
| `q` | String | Free-text search across document_number |
| `documentType` | String | Filter by document type |
| `status` | String | draft, sent, approved, paid, cancelled, expired |
| `referenceType` | String | sale, purchase, payment, customer, etc. |
| `referenceId` | UUID | Filter by specific reference |
| `dateFrom` | ISO date | Created after |
| `dateTo` | ISO date | Created before |
| `page` | int | 0-based, default 0 |
| `size` | int | Default 20 |
| `sort` | String | createdAt,desc or documentNumber,asc |

### Repository

Add to `DocumentRepository`:
```java
@Query("SELECT d FROM Document d WHERE d.tenantId = :tenantId "
    + "AND (:q IS NULL OR d.documentNumber ILIKE '%' || :q || '%') "
    + "AND (:documentType IS NULL OR d.documentType = :documentType) "
    + "AND (:status IS NULL OR d.status = :status) "
    + "AND (:referenceType IS NULL OR d.referenceType = :referenceType) "
    + "AND (:dateFrom IS NULL OR d.createdAt >= :dateFrom) "
    + "AND (:dateTo IS NULL OR d.createdAt <= :dateTo)")
Page<Document> search(
    @Param("tenantId") UUID tenantId,
    @Param("q") String q,
    @Param("documentType") String documentType,
    @Param("status") String status,
    @Param("referenceType") String referenceType,
    @Param("dateFrom") Instant dateFrom,
    @Param("dateTo") Instant dateTo,
    Pageable pageable);
```

### Migration

Add composite index in `V5__search_index.sql`:
```sql
CREATE INDEX idx_documents_search ON documents (tenant_id, document_type, status, created_at DESC);
```

## Frontend

### Page: DocumentSearchPage (`/smartpos/documents/search`)

**Layout:** Filter panel on the left, results table on the right.

**Filter bar components:**
- Text field for document number search (with debounce)
- Document type dropdown
- Status dropdown
- Reference type dropdown
- Date range picker (from → to)
- "Clear Filters" button

**Results table (EnhancedDataTable):**
- Columns: Document #, Type, Date, Reference, Status (badge), Quick Actions
- Sortable by date and document number
- Paginated
- Each row has a small action button group: Preview, Download, Print, Email

### Route
Add to `Router.tsx`:
```tsx
{ path: 'documents/search', element: <Loadable component={lazy(() => import('src/views/smartpos/documents/DocumentSearchPage'))} /> },
```

### Sidebar
Add "Document Search" entry in SmartPOS menu under a new "Documents" section.

## What It Takes

| Component | Effort |
|---|---|
| Backend: JPQL query + controller endpoint + migration | ~2 hours |
| Frontend: DocumentSearchPage + filter bar | ~3 hours |
| Route + sidebar nav | ~1 hour |
| **Total** | **~1 day** |

## Files

```
BACKEND (new):
- V5__search_index.sql (Flyway migration)

BACKEND (modified):
- DocumentRepository.java (search query)
- DocumentController.java (search endpoint)

FRONTEND (new):
- views/smartpos/documents/DocumentSearchPage.tsx

FRONTEND (modified):
- routes/Router.tsx (add route)
- components/smartpos/SmartPosMenuItems.ts (sidebar nav)
```
