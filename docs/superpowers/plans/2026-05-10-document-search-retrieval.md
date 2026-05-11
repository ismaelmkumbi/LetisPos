# Document Search & Retrieval — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add metadata search across all generated documents with filters for document number, type, status, reference type, and date range, displayed in a paginated sortable results table.

**Architecture:** New JPQL search query on the existing `documents` table with a composite index for performance. New search endpoint in DocumentController. New frontend page with filter panel + EnhancedDataTable.

**Tech Stack:** Java 21, Spring Data JPA, PostgreSQL, React 19, TypeScript, MUI v7

---

### Task 1: Backend — search index, query, and endpoint

**Files:**
- Create: `backend/document-service/src/main/resources/db/migration/V5__search_index.sql`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/DocumentRepository.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`

- [ ] **Step 1: Create V5 migration**

Create `backend/document-service/src/main/resources/db/migration/V5__search_index.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_documents_search
    ON documents (tenant_id, document_type, status, created_at DESC);
```

- [ ] **Step 2: Add search query to DocumentRepository**

Read `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/DocumentRepository.java`. Add:

```java
import java.time.Instant;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

@Query("SELECT d FROM Document d WHERE d.tenantId = :tenantId "
    + "AND (:q IS NULL OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :q, '%'))) "
    + "AND (:documentType IS NULL OR d.documentType = :documentType) "
    + "AND (:status IS NULL OR d.status = :status) "
    + "AND (:referenceType IS NULL OR d.referenceType = :referenceType) "
    + "AND (CAST(:dateFrom AS timestamp) IS NULL OR d.createdAt >= :dateFrom) "
    + "AND (CAST(:dateTo AS timestamp) IS NULL OR d.createdAt <= :dateTo)")
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

- [ ] **Step 3: Add search endpoint to DocumentController**

Read `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`. Add:

```java
@GetMapping("/search")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Page<DocumentDto>> search(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String documentType,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String referenceType,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt,desc") String sort) throws Exception {
    UUID tenantId = TenantContext.require();
    String[] sortParts = sort.split(",");
    Sort.Direction dir = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")
        ? Sort.Direction.ASC : Sort.Direction.DESC;
    Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));

    Instant from = dateFrom != null ? Instant.parse(dateFrom) : null;
    Instant to = dateTo != null ? Instant.parse(dateTo) : null;

    Page<Document> docs = documentRepo.search(tenantId, q, documentType, status, referenceType, from, to, pageable);
    return ResponseEntity.ok(docs.map(d -> DocumentDto.from(d, null)));
}
```

Add import: `import java.time.Instant;`

- [ ] **Step 4: Compile and commit**

```bash
cd backend && mvn compile -pl document-service
git add backend/document-service/
git commit -m "feat: add document search with JPQL query and composite index"
```

---

### Task 2: Frontend — DocumentSearchPage

**Files:**
- Create: `frontend/src/views/smartpos/documents/DocumentSearchPage.tsx`
- Create: `frontend/src/api/smartpos/documents.ts` (add search API function)
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add search API function to documents.ts**

Read `frontend/src/api/smartpos/documents.ts`. Add:

```ts
// ---- Search Endpoints ----

export interface DocumentSearchParams {
  q?: string;
  documentType?: string;
  status?: string;
  referenceType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function searchDocuments(params: DocumentSearchParams = {}): Promise<Page<DocumentDto>> {
  const { data } = await api.get<Page<DocumentDto>>('/api/v1/documents/search', { params });
  return data;
}
```

- [ ] **Step 2: Create DocumentSearchPage.tsx**

Create `frontend/src/views/smartpos/documents/DocumentSearchPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Button, Stack, debounce,
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import EnhancedDataTable from 'src/components/smartpos/EnhancedDataTable';
import DocumentStatusBadge from 'src/components/smartpos/documents/DocumentStatusBadge';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import { searchDocuments, listTemplates, type DocumentDto, type TemplateInfo } from 'src/api/smartpos/documents';

const DOC_TYPES = [
  'quotation', 'tax-invoice', 'proforma-invoice', 'purchase-order',
  'payment-receipt', 'credit-note', 'delivery-note', 'goods-received',
  'customer-statement',
];

const STATUSES = ['draft', 'sent', 'approved', 'paid', 'cancelled', 'expired'];
const REF_TYPES = ['sale', 'purchase', 'payment', 'customer', 'return', 'transfer'];

export default function DocumentSearchPage() {
  const [results, setResults] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ q: '', documentType: '', status: '', referenceType: '', dateFrom: '', dateTo: '' });

  const doSearch = useCallback(async (p: number, f: typeof filters) => {
    setLoading(true);
    try {
      const res = await searchDocuments({ ...f, page: p, size: 20, sort: 'createdAt,desc' });
      setResults(res.content);
      setTotal(res.totalElements);
    } finally { setLoading(false); }
  }, []);

  const debouncedSearch = useCallback(debounce((f: typeof filters) => doSearch(0, f), 300), [doSearch]);

  useEffect(() => { doSearch(0, filters); }, []);

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(0);
    debouncedSearch(next);
  };

  const clearFilters = () => {
    const empty = { q: '', documentType: '', status: '', referenceType: '', dateFrom: '', dateTo: '' };
    setFilters(empty);
    setPage(0);
    doSearch(0, empty);
  };

  const columns = [
    { id: 'documentNumber', label: 'Document #', width: 160 },
    { id: 'documentType', label: 'Type', width: 160, render: (v: string) => v.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    { id: 'createdAt', label: 'Date', width: 140, render: (v: string) => new Date(v).toLocaleDateString() },
    { id: 'referenceType', label: 'Reference', width: 120 },
    { id: 'status', label: 'Status', width: 130, render: (v: string) => <DocumentStatusBadge status={v} /> },
    { id: 'id', label: 'Actions', width: 320, render: (_: unknown, row: DocumentDto) => (
      <DocumentActionsBar documentType={row.documentType} referenceType={row.referenceType} referenceId={row.referenceId} disabled={false} />
    )},
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Document Search</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Document #" value={filters.q}
          onChange={e => updateFilter('q', e.target.value)} sx={{ minWidth: 200 }}
          InputProps={{ startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} /> }} />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filters.documentType} label="Type" onChange={e => updateFilter('documentType', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={e => updateFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {STATUSES.map(s => <MenuItem key={s} value={s}><DocumentStatusBadge status={s} /></MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Reference Type</InputLabel>
          <Select value={filters.referenceType} label="Reference Type" onChange={e => updateFilter('referenceType', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {REF_TYPES.map(r => <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField size="small" label="From" type="date" value={filters.dateFrom}
          onChange={e => updateFilter('dateFrom', e.target.value)} sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }} />

        <TextField size="small" label="To" type="date" value={filters.dateTo}
          onChange={e => updateFilter('dateTo', e.target.value)} sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }} />

        <Button onClick={clearFilters} startIcon={<IconX size={14} />} size="small">Clear</Button>
      </Stack>

      <EnhancedDataTable
        columns={columns}
        rows={results}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onPageChangeCommit={(p) => doSearch(p, filters)}
      />
    </Box>
  );
}
```

- [ ] **Step 3: Add route to Router.tsx**

Read `frontend/src/routes/Router.tsx`. Find the `/smartpos` children section. Add:

```tsx
{ path: 'documents/search', element: <Loadable component={lazy(() => import('src/views/smartpos/documents/DocumentSearchPage'))} /> },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add DocumentSearchPage with filters and results table"
```

---

### Task 3: Sidebar navigation entry

**Files:**
- Modify: `frontend/src/components/smartpos/SmartPosMenuItems.ts`

- [ ] **Step 1: Add sidebar nav entry**

Read `frontend/src/components/smartpos/SmartPosMenuItems.ts`. Find the menu items array. Add a "Documents" section or add under an existing section:

```tsx
{
  section: 'Documents',
  items: [
    { label: 'Document Search', icon: IconSearch, path: '/smartpos/documents/search' },
  ],
},
```

Add the import: `import { IconSearch } from '@tabler/icons-react';` (if not already imported).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/SmartPosMenuItems.ts
git commit -m "feat: add Document Search to sidebar navigation"
```
