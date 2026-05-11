# Document AI Layer — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 AI-powered features (summarization, field mapping, template assistant, anomaly detection) by connecting document-service to the existing ai-service via Feign.

**Architecture:** document-service Feign → ai-service (port 8091) → LLM. Each feature: 1 Feign call + 1 endpoint + 1 UI component. No new tables beyond a summary column.

**Tech Stack:** Java 21, Spring Cloud OpenFeign, React 19, TypeScript, MUI v7

---

### Task 1: Backend — AiServiceClient Feign + AI endpoints

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/AiServiceClient.java`
- Create: `backend/document-service/src/main/resources/db/migration/V6__document_summary.sql`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/api/TemplateController.java`
- Modify: `backend/document-service/src/main/resources/application.yml`

- [ ] **Step 1: Add ai-service Feign config to application.yml**

Read `backend/document-service/src/main/resources/application.yml`. Add under `spring.cloud.openfeign.client.config`:

```yaml
    ai-service:
      url: ${AI_SERVICE_URI:http://localhost:8091}
```

- [ ] **Step 2: Create AiServiceClient.java**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/AiServiceClient.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@FeignClient(name = "ai-service", url = "${spring.cloud.openfeign.client.config.ai-service.url}")
public interface AiServiceClient {

    @PostMapping("/api/v1/ai/narrate")
    Map<String, Object> narrate(@RequestBody Map<String, Object> request);

    @PostMapping("/api/v1/ai/reports/anomalies")
    Map<String, Object> detectAnomalies(@RequestBody Map<String, Object> request);

    @PostMapping("/api/v1/ai/chat")
    Map<String, Object> chat(@RequestBody Map<String, Object> request);
}
```

- [ ] **Step 3: Create V6 migration for summary column**

Create `backend/document-service/src/main/resources/db/migration/V6__document_summary.sql`:

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary VARCHAR(500);
```

- [ ] **Step 4: Add AI endpoints to DocumentController**

Read `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`. Add field: `private final AiServiceClient aiClient;`

Add summarization endpoint:
```java
@PostMapping("/{id}/summarize")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Map<String, String>> summarize(@PathVariable UUID id) throws Exception {
    Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
        .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
    Map<String, Object> req = Map.of(
        "facts", Map.of(
            "documentType", doc.getDocumentType(),
            "documentNumber", doc.getDocumentNumber(),
            "referenceType", doc.getReferenceType()
        ),
        "instruction", "Summarize this document in 2-3 sentences for a business audience."
    );
    Map<String, Object> result = aiClient.narrate(req);
    String summary = (String) result.getOrDefault("narrative", "");
    doc.setSummary(summary);
    documentRepo.save(doc);
    return ResponseEntity.ok(Map.of("summary", summary));
}
```

Add field mapping endpoint:
```java
@PostMapping("/field-map")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Map<String, Object>> fieldMap(@RequestBody Map<String, Object> body) throws Exception {
    String documentType = (String) body.get("documentType");
    @SuppressWarnings("unchecked")
    List<String> headers = (List<String>) body.get("headers");
    Map<String, Object> req = Map.of(
        "prompt", "Map these CSV headers to document template fields for a " + documentType
            + ". Headers: " + String.join(", ", headers)
            + ". Return JSON: {\"mappings\": {\"templateField\": \"headerName\", ...}, \"confidence\": 0.0-1.0}",
        "responseFormat", "json"
    );
    Map<String, Object> result = aiClient.chat(req);
    return ResponseEntity.ok(result);
}
```

Add anomalies endpoint:
```java
@PostMapping("/{id}/anomalies")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Map<String, Object>> anomalies(@PathVariable UUID id) throws Exception {
    Document doc = documentRepo.findByIdAndTenantId(id, TenantContext.require())
        .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
    Map<String, Object> req = Map.of(
        "data", Map.of(
            "documentNumber", doc.getDocumentNumber(),
            "documentType", doc.getDocumentType(),
            "status", doc.getStatus(),
            "createdAt", doc.getCreatedAt().toString()
        )
    );
    Map<String, Object> result = aiClient.detectAnomalies(req);
    return ResponseEntity.ok(result);
}
```

Add needed imports: `import io.smartpos.documents.infrastructure.feign.AiServiceClient;`, `import java.util.List;`.

- [ ] **Step 5: Add assist endpoint to TemplateController**

Read `backend/document-service/src/main/java/io/smartpos/documents/api/TemplateController.java`. Add field: `private final AiServiceClient aiClient;`

Add:
```java
@PostMapping("/{documentType}/assist")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<Map<String, Object>> assist(
        @PathVariable String documentType,
        @RequestBody Map<String, String> body) throws Exception {
    String prompt = body.get("prompt");
    String currentConfig = body.getOrDefault("currentConfig", "{}");
    Map<String, Object> req = Map.of(
        "prompt", "You are a document template designer. The current template config is: "
            + currentConfig + ". User request: " + prompt
            + ". Return ONLY the updated JSON config. Keep the same structure.",
        "responseFormat", "json"
    );
    Map<String, Object> result = aiClient.chat(req);
    return ResponseEntity.ok(result);
}
```

- [ ] **Step 6: Compile and commit**

```bash
cd backend && mvn compile -pl document-service
git add backend/document-service/
git commit -m "feat: add AI service client and 4 AI endpoints (summarize, field-map, assist, anomalies)"
```

---

### Task 2: Frontend — Summarization + Anomaly Detection UI

**Files:**
- Create: `frontend/src/components/smartpos/documents/AnomalyBanner.tsx`
- Modify: `frontend/src/components/smartpos/documents/DocumentPreviewModal.tsx`
- Modify: `frontend/src/components/smartpos/documents/DocumentEmailDialog.tsx`
- Modify: `frontend/src/components/smartpos/documents/DocumentActionsBar.tsx`
- Modify: `frontend/src/api/smartpos/documents.ts`

- [ ] **Step 1: Add AI API functions to documents.ts**

Read `frontend/src/api/smartpos/documents.ts`. Add:

```ts
// ---- AI Endpoints ----

export async function summarizeDocument(id: UUID): Promise<{ summary: string }> {
  const { data } = await api.post<{ summary: string }>(`/api/v1/documents/${id}/summarize`);
  return data;
}

export async function detectAnomalies(id: UUID): Promise<{ anomalies: Array<{ field: string; severity: string; message: string; suggestion?: string }> }> {
  const { data } = await api.post<{ anomalies: Array<{ field: string; severity: string; message: string; suggestion?: string }> }>(`/api/v1/documents/${id}/anomalies`);
  return data;
}

export async function fieldMap(body: { documentType: string; headers: string[] }): Promise<{ mappings: Record<string, string>; confidence: number }> {
  const { data } = await api.post<{ mappings: Record<string, string>; confidence: number }>('/api/v1/documents/field-map', body);
  return data;
}

export async function assistTemplate(documentType: string, prompt: string, currentConfig: string): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(`/api/v1/templates/${documentType}/assist`, { prompt, currentConfig });
  return data;
}
```

- [ ] **Step 2: Create AnomalyBanner.tsx**

Create `frontend/src/components/smartpos/documents/AnomalyBanner.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Alert, AlertTitle, Box, CircularProgress } from '@mui/material';
import { IconAlertTriangle } from '@tabler/icons-react';
import { detectAnomalies } from '../../../api/smartpos/documents';

export default function AnomalyBanner({ documentId }: { documentId: string }) {
  const [anomalies, setAnomalies] = useState<Array<{ field: string; severity: string; message: string; suggestion?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLoading(true);
    detectAnomalies(documentId).then(r => setAnomalies(r.anomalies ?? [])).finally(() => setLoading(false));
  }, [documentId]);

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={16} /></Box>;
  if (dismissed || anomalies.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {anomalies.map((a, i) => (
        <Alert key={i} severity={a.severity === 'critical' ? 'error' : 'warning'} icon={<IconAlertTriangle size={16} />}
          onClose={() => setDismissed(true)} sx={{ mb: 0.5 }}>
          <AlertTitle sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.field}</AlertTitle>
          {a.message}{a.suggestion && ` — ${a.suggestion}`}
        </Alert>
      ))}
    </Box>
  );
}
```

- [ ] **Step 3: Modify DocumentPreviewModal for summary + anomalies**

Read `DocumentPreviewModal.tsx`. Add above the preview content:

```tsx
import AnomalyBanner from './AnomalyBanner';

// After loading check, before preview tabs:
{documentId && <AnomalyBanner documentId={documentId} />}
{docSummary && (
  <Alert severity="info" sx={{ mb: 2 }} icon={<IconSparkles size={16} />}
    action={<Button size="small" onClick={() => setDocSummary(null)}>Dismiss</Button>}>
    <AlertTitle sx={{ fontSize: '0.8rem', fontWeight: 600 }}>AI Summary</AlertTitle>
    {docSummary}
  </Alert>
)}
```

Add state: `const [docSummary, setDocSummary] = useState<string | null>(null);`
Add import: `import { summarizeDocument } from '../../../api/smartpos/documents';` and `import { IconSparkles } from '@tabler/icons-react';`

- [ ] **Step 4: Modify DocumentActionsBar for Summarize button**

Read `DocumentActionsBar.tsx`. Add a "Summarize" button after the existing buttons (or use a dropdown for secondary actions):

```tsx
<Button onClick={handleSummarize} disabled={!doc || summarizing} startIcon={summarizing ? <CircularProgress size={14} /> : <IconSparkles size={16} />}>
  Summarize
</Button>
```

Add state: `const [summarizing, setSummarizing] = useState(false);`
Add handler: calls `summarizeDocument(doc.id)` and fires `onGenerate` callback with updated doc.

Add import: `import { IconSparkles } from '@tabler/icons-react';`

- [ ] **Step 5: Modify DocumentEmailDialog to use summary**

Read `DocumentEmailDialog.tsx`. Add optional `defaultBody?: string` prop. If provided, use it as the default message instead of the generic text.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: add AI summarization and anomaly detection UI components"
```

---

### Task 3: Frontend — Template Assistant Chat + Field Mapping

**Files:**
- Create: `frontend/src/components/smartpos/documents/editor/TemplateAssistantChat.tsx`
- Create: `frontend/src/components/smartpos/documents/FieldMappingPreview.tsx`
- Modify: `frontend/src/views/smartpos/settings/TemplateEditorPage.tsx`
- Modify: `frontend/src/components/smartpos/documents/BulkGenerateDialog.tsx`

- [ ] **Step 1: Create TemplateAssistantChat.tsx**

Create `frontend/src/components/smartpos/documents/editor/TemplateAssistantChat.tsx`:

```tsx
import { useState, useRef } from 'react';
import { Box, TextField, IconButton, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { IconSend, IconSparkles, IconCheck } from '@tabler/icons-react';
import { assistTemplate } from '../../../../api/smartpos/documents';

interface Message { role: 'user' | 'assistant'; content: string; config?: Record<string, unknown>; }

interface TemplateAssistantChatProps {
  documentType: string;
  currentConfig: string;
  onApplyConfig: (config: Record<string, unknown>) => void;
}

export default function TemplateAssistantChat({ documentType, currentConfig, onApplyConfig }: TemplateAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await assistTemplate(documentType, input, currentConfig);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Done! Here is the updated template. Click Apply to use it.', config: result }]);
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconSparkles size={16} /> AI Template Assistant
      </Typography>
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        {messages.map((msg, i) => (
          <Paper key={i} sx={{ p: 1.5, mb: 1, maxWidth: '90%', ml: msg.role === 'assistant' ? 0 : 'auto',
            bgcolor: msg.role === 'assistant' ? '#f0f4ff' : '#f0fdf4' }}>
            <Typography variant="body2">{msg.content}</Typography>
            {msg.config && (
              <Button size="small" startIcon={<IconCheck size={14} />} sx={{ mt: 1 }}
                onClick={() => onApplyConfig(msg.config!)}>Apply</Button>
            )}
          </Paper>
        ))}
        {loading && <CircularProgress size={16} sx={{ mx: 'auto', display: 'block' }} />}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" fullWidth placeholder="Describe the changes you want..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          inputRef={inputRef} disabled={loading} />
        <IconButton onClick={handleSend} disabled={loading || !input.trim()} color="primary">
          <IconSend size={16} />
        </IconButton>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Modify TemplateEditorPage to add assistant panel**

Read `TemplateEditorPage.tsx`. Add a toggle button "AI Assistant" that shows/hides a right-side panel with `TemplateAssistantChat`. Pass `documentType`, `currentConfig` (JSON.stringify(config)), and `onApplyConfig` (parses result and sets config).

Add import: `import TemplateAssistantChat from '../../../components/smartpos/documents/editor/TemplateAssistantChat';`

- [ ] **Step 3: Create FieldMappingPreview.tsx**

Create `frontend/src/components/smartpos/documents/FieldMappingPreview.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Chip, LinearProgress } from '@mui/material';
import { IconSparkles, IconCheck, IconX } from '@tabler/icons-react';
import { fieldMap } from '../../../api/smartpos/documents';

interface FieldMappingPreviewProps {
  documentType: string;
  headers: string[];
  onMappingReady: (mapping: Record<string, string>) => void;
}

export default function FieldMappingPreview({ documentType, headers, onMappingReady }: FieldMappingPreviewProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fieldMap({ documentType, headers }).then(r => {
      setMappings(r.mappings ?? {});
      setConfidence(r.confidence ?? 0);
      onMappingReady(r.mappings ?? {});
    }).finally(() => setLoading(false));
  }, [documentType]);

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={16} /><Typography variant="caption" display="block">AI is mapping fields...</Typography></Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconSparkles size={16} /> AI Field Mapping
        <Chip label={`${Math.round(confidence * 100)}% confidence`} size="small" color={confidence > 0.7 ? 'success' : 'warning'} />
      </Typography>
      {Object.entries(mappings).map(([field, header]) => (
        <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
          <Chip label={header} size="small" /><IconCheck size={14} color="#22c55e" /><Typography variant="body2" color="text.secondary">→ {field}</Typography>
        </Box>
      ))}
    </Box>
  );
}
```

- [ ] **Step 4: Modify BulkGenerateDialog to show field mapping**

Read `BulkGenerateDialog.tsx`. If the dialog receives `headers` prop (for CSV import), show `FieldMappingPreview` before the Generate step.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: add AI template assistant chat and field mapping preview"
```

---

### Task 4: Wire up — FeignJwtForwarder for ai-service calls

**Files:**
- Modify: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/FeignJwtForwarder.java`

- [ ] **Step 1: Verify FeignJwtForwarder already handles JWT for all Feign calls**

Read the existing `FeignJwtForwarder.java`. It already forwards `Authorization: Bearer <jwt>` on ALL outgoing Feign requests via the `RequestInterceptor` bean. No changes needed — ai-service calls will automatically carry the user's JWT.

- [ ] **Step 2: Verify ai-service endpoints accept the required authorities**

The existing ai-service endpoints require specific authorities (e.g., `ai.insight`, `ai.chat`). The user's JWT must have these authorities for the calls to succeed.

Note: If user JWTs don't carry `ai.insight` authority, the ai-service calls will return 403. This requires either:
a) Adding the authority to the user's JWT (auth-service config), or
b) Using a service-account pattern where document-service calls ai-service with its own internal credentials.

This is a deployment configuration concern, not a code issue.

- [ ] **Step 3: Verify compilation and commit**

```bash
cd backend && mvn compile -pl document-service
git add backend/document-service/
git commit -m "chore: verify Feign JWT forwarding for ai-service calls"
```
