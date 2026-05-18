# AI Assistant Intelligence Upgrade — Design Spec

## Summary

Make LetisPOS Assistant dramatically smarter by adding multi-turn
conversation memory, wiring in intent classification, building a
LetisPOS knowledge base with semantic search, and personalizing the
assistant per user role.

The assistant transitions from a stateless single-shot Q&A tool to a
persistent, context-aware, role-adapted expert that remembers past
exchanges, teaches users how to use the product, and anticipates needs.

---

## Architecture

```
POST /api/v1/ai/assistant/chat
    │
    ▼
AssistantService
    ├─ IntentClassifierService.classify(message)          ← wired in
    │   ├─ Domain, language, isWrite, time resolution
    │   └─ Narrows tool catalog before LLM call
    │
    ├─ ConversationStore.load(conversationId, tenantId)    ← NEW (Redis)
    │   └─ Two-tier: summary + recent messages (sliding window)
    │
    ├─ KnowledgeBase.search(message, domain)              ← NEW
    │   ├─ Embed query (text-embedding-3-small)
    │   ├─ Cosine similarity → top 3 chunks
    │   └─ Inject into system prompt as context
    │
    ├─ RoleProfile.forRole(roles)                         ← NEW
    │   └─ Tone, verbosity, examples, max tool rounds
    │
    ├─ AssistantPromptBuilder.build(...)                  ← ENHANCED
    │   └─ Tenant context + role profile + conversation summary
    │       + knowledge chunks + domain hint + resolved time
    │
    ├─ AiProvider.completeWithTools(systemPrompt, messages[], tools)
    │   └─ Messages[] = summary + history + current message
    │       (standard chat format across OpenAI, Anthropic, DeepSeek)
    │
    └─ ConversationStore.save(conversationId, exchange)   ← NEW
```

---

## Phase 1: Conversation Memory + Intent Classification

### Conversation Store (Redis)

```
Key:   assistant:conv:{tenantId}:{conversationId}
Value: JSON { summary, messages: [...] }
TTL:   30 minutes, refreshed on each write
```

Message format:
```json
{
  "role": "user",
  "content": "what are my top products this week?",
  "timestamp": "2026-05-18T10:30:00Z"
}
```

Full message roles: `user`, `assistant` (with `tool_calls` when present),
`tool` (with `tool_call_id`). The complete exchange history is stored so
follow-up questions have full context.

Server generates `conversationId` on first message. Client receives it in
the first SSE event (`meta` type) and sends it back on subsequent requests.

### Summarization

Two-tier memory:

- **Recent window** (last ~10 exchanges): full detail including all tool
  results
- **Older history**: compressed into a 200-word summary injected into the
  system prompt

Summarization fires when conversation exceeds 10 exchanges. Uses DeepSeek
(cheap, fast, good enough for compression). Summary preserves: domain,
key entities, critical numbers, user intent, pending drafts.

### Intent Classification Wired In

The existing `IntentClassifierService` is currently unused by the assistant
flow. It is now called at the start of every request and drives:

| Signal | Effect |
|--------|--------|
| `language` | Swahili/English detection overrides client language setting |
| `primaryDomain` | Narrows tool catalog when confidence is high; falls back to all tools when uncertain |
| `isWrite` | Primes the LLM to use draft→confirm flow |
| `resolvedTime` | Pre-resolved dates from "today", "this week", "last month", etc. |

### API Change

`POST /api/v1/ai/assistant/chat`

| Field | Before | After |
|-------|--------|-------|
| `conversationId` | Optional in body | Removed from body |
| SSE first event | None | `{type: "meta", conversationId: "<uuid>"}` |
| Client responsibility | Manage own conversationId | Store returned conversationId, send as `?conversationId=<uuid>` |

### Provider Interface — Multi-Turn

New method signatures alongside existing single-turn ones (backward
compatible for non-assistant callers):

```java
ToolCallResult completeWithTools(
    String systemPrompt,
    List<Map<String, Object>> messages,
    List<Map<String, Object>> tools);

Result complete(
    String systemPrompt,
    List<Map<String, Object>> messages);
```

`messages[]` uses standard chat format: `[{role, content, tool_calls?,
tool_call_id?}, ...]` — native to OpenAI, DeepSeek, and Anthropic APIs.

Anthropic provider gains full `completeWithTools` support via Anthropic's
native tool-use API. All three providers (OpenAI, Anthropic, DeepSeek)
normalize into the common `ToolCall`/`ToolCallResult` types.

---

## Phase 2: Knowledge Base / RAG

### Purpose

Enable the assistant to answer "how do I..." questions about LetisPOS
itself: product walkthroughs, feature guides, troubleshooting, best
practices contextualized for the specific tenant setup.

### Storage

Markdown files with YAML frontmatter, stored in version control:

```
ai-service/src/main/resources/knowledge/
    ├── sales/processing-a-refund.md
    ├── sales/applying-discounts.md
    ├── inventory/stock-counting.md
    ├── inventory/handling-expiring-stock.md
    ├── products/managing-barcodes.md
    ├── customers/loyalty-program-setup.md
    ├── customers/store-credit.md
    ├── finance/recording-expenses.md
    ├── hrm/employee-attendance.md
    ├── settings/configuring-tables.md
    └── ...
```

Each file:
```markdown
---
title: Processing a Refund
category: sales
tags: [refund, returns, credit, receipt]
---

# Processing a Refund

1. Open the Sales module from the sidebar
2. ...

## Important Notes
- Refunds require the `sales.refund` permission
...
```

### Retrieval Pipeline

```
On startup:
  1. Scan knowledge/ directory
  2. Parse frontmatter + markdown content
  3. Chunk into ~500-word sections (preserve heading hierarchy)
  4. Embed each chunk via OpenAI text-embedding-3-small
  5. Cache embeddings in memory (~250 chunks × 1536 dims ≈ 1.5MB)

On each user message:
  1. IntentClassifier — if HELP domain or low confidence → search KB
  2. Embed user question (same model)
  3. Cosine similarity against all cached chunks
  4. Return top 3 chunks
  5. Inject into system prompt:
     "Use the following knowledge to answer:
      [Chunk 1: ...]
      [Chunk 2: ...]"
```

In-memory embeddings (no pgvector initially). When the KB exceeds ~500
articles, migrate to pgvector — that's a future optimization.

### Content Creation

Written once by the team. Stored in git — reviewable, versionable,
deployable like code. Initial target: 30-50 articles covering core
LetisPOS workflows.

---

## Phase 3: Role-Based Personalization

### Role Profiles

| Profile | Tone | Verbosity | Max Tool Rounds | Default Domain |
|---------|------|-----------|-----------------|----------------|
| CASHIER | Procedural, step-by-step, fast | 2-3 sentences | 2 | Sales, products |
| MANAGER | Operational, data + action | Moderate with context | 4 | Sales, inventory, HRM |
| OWNER | Analytical, strategic, margin-focused | Detailed with recommendations | 5 | Sales, finance, customers |
| SUPER_ADMIN | Platform-level, authoritative | Detailed with cross-tenant context | 6 | Platform, tenants, billing |

### System Prompt Differences

**Cashier** — direct answers, no strategy, no trends:
```
You are talking to a cashier at the front counter. Be FAST.
- Lead with the direct answer
- Don't explain strategy or trends — they need specific facts or procedures
- Get the data and present it cleanly
```

**Owner** — insights + recommendations:
```
You are talking to the store owner. Be insightful.
- Lead with the headline metric, then context, then recommended action
- Include comparisons (vs yesterday, vs last week) when showing numbers
- Proactively flag risks and opportunities
- Think about margins, not just revenue
```

### Proactive Alerts (Owner / Manager)

First message in a new conversation can include a system-generated
briefing: sales snapshot, low-stock alerts, expiry warnings. Same data
as the `getExecutiveBriefing` tool but triggered before the user asks.
Configurable per user in settings.

### Permission Enforcement

Role profiles shape the experience but do NOT control access. Tool
catalog filtering and executor-level permission checks remain the hard
security boundary. A cashier's role profile describes them as sales-focused,
but the tool catalog is what prevents them from accessing finance data.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Conversation expired (30 min TTL) | Server returns new conversationId; assistant says "Starting a fresh conversation" |
| Embedding API rate limited | Skip KB search for this request, answer without knowledge context |
| DeepSeek summarization fails | Drop older history, warn but continue |
| Knowledge file parse error on startup | Log and skip the file, continue with remaining articles |
| Role unknown (missing JWT claims) | Default to CASHIER profile (most restrictive) |
| Anthropic tool-calling not available | Fall back to OpenAI, then DeepSeek |

---

## What This Is NOT

- **Not a vector database migration.** Embeddings stay in-memory. No
  pgvector or Pinecone dependency.
- **Not a training/fine-tuning pipeline.** The LLM is not fine-tuned.
  Intelligence comes from better prompting, tools, memory, and RAG.
- **Not replacing the existing AI pages.** `AiInsightsPage`,
  `DemandForecastingPage`, etc. remain as dedicated experiences.
- **Not agentic / autonomous.** The assistant still responds to user
  prompts. Proactive alerts are opt-in and triggered by the user opening
  the chat, not by background monitoring.
