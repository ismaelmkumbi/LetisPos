# Embedded AI Assistant — Design Spec

## Summary

A floating AI assistant inside the LetisPOS dashboard. Merchants and admins
chat with the assistant to query store data, get insights, and perform
actions — without leaving the app. The assistant has read/write access to all
17 service domains, scoped to the user's role and permissions.

GPT-4o is the primary LLM (already paid). DeepSeek serves as a fast/cheap
fallback for simple lookups. The assistant reuses the existing ai-service
`AiRouter` → `AiProvider` pipeline and `AiInvocation` metering.

---

## Architecture

```
Frontend                         ai-service                      Internal
────────                         ──────────                      Services
ChatOverlay ──POST SSE──> /api/v1/ai/assistant/chat              product-svc
  │                           ├─ JWT auth + perm check            inventory-svc
  │                           ├─ Orchestrator                     sales-svc
  │                           │   ├─ System prompt builder        payment-svc
  │                           │   ├─ Tool catalog (scoped)        report-svc
  │                           │   ├─ GPT-4o call (func calling)   hrm-svc
  │                           │   ├─ Tool executor (Feign)        integration-svc
  │                           │   └─ Draft store (Redis)          ...
  │                           └─ AiInvocation logger
  └─ SSE stream ── tokens / tool-calls / drafts / errors
```

One new controller. No new service. Reuses:

- `AiRouter` — provider selection (OpenAI primary, DeepSeek fallback)
- `AiProvider.complete()` — LLM calls
- `AiInvocation` — token counting, billing audit
- Existing Feign clients — `SalesFeign`, `InventoryFeign`, `ProductFeign`,
  `ReportFeign`, `PaymentFeign`, `CustomerFeign`, etc.
- `TenantContext` — automatic tenant scoping

---

## Assistant Controller

### POST /api/v1/ai/assistant/chat

SSE streaming endpoint. Request body:

```json
{
  "message": "What were my top selling products this week?",
  "conversationId": null,
  "language": "en"
}
```

Response stream events:

| Event | Purpose |
|-------|---------|
| `token` | Streamed text tokens |
| `tool_start` | Tool call invoked, display loading indicator |
| `tool_result` | Tool call completed, render result (chart/table/text) |
| `draft` | Write action draft ready for confirmation |
| `error` | Tool or LLM error |
| `done` | Stream complete |

### POST /api/v1/ai/assistant/confirm/{draftId}

User confirms a draft. Executes the pending action and streams the result.

### POST /api/v1/ai/assistant/reject/{draftId}

User rejects a draft. Deletes it from Redis.

---

## Orchestrator Flow

```
1. User sends message
2. Build system prompt + tool catalog (scoped to user permissions)
3. GPT-4o call with function calling
4a. Text response → stream tokens → done
4b. Tool call(s) → executor runs via Feign → format result → feed back to 3
4c. Write action → store draft in Redis → stream draft preview → wait for confirm/reject
5a. Confirmed → execute action → format result → feed back to 3
5b. Rejected → delete draft → return cancellation to LLM
```

The orchestrator loops tool calls (step 4b → 3) until the LLM produces a final
text response or the user takes action on a draft. Max 5 tool call rounds per
request to prevent runaway loops.

---

## System Prompt

Assembled per-request from tenant context, JWT claims, and user locale:

```
You are LetisPOS Assistant, an AI helper for retail store management.

Store context:
- Store name: {tenantName}
- Plan: {billingPlan}
- User role: {userRoles}
- Today: {date}
- Currency: {localeCurrency}

You can access sales, inventory, products, customers, finance, HRM,
and more. Use tools whenever you need real data.

Rules:
- Always use tools for factual questions about the store's data
- Cite specific numbers and names from tool results
- For write actions, explain what will happen before using the tool
- If a tool returns an error, tell the user what went wrong
- Respond in {language} (English or Swahili)
- Keep responses concise and actionable

You do NOT have access to: other tenants' data, system administration,
or the ability to change billing/subscription.
```

Super admins see an additional line granting admin tool access.

---

## Tool Catalog

Each tool is an OpenAI function definition: name, description, parameter
schema, and a `write` flag for draft gating.

### Read tools (excerpt)

| Tool | Parameters | Maps to |
|------|-----------|---------|
| `getSalesReport` | dateRange, groupBy | `SalesFeign` + `ReportFeign` |
| `checkStock` | productIds[], warehouseId | `InventoryFeign` |
| `getTopProducts` | limit, dateRange, orderBy | `ProductFeign` + `ReportFeign` |
| `getTopCustomers` | limit, dateRange | `CustomerFeign` + `ReportFeign` |
| `getFinancialSummary` | dateRange | `PaymentFeign` |
| `getExpiryReport` | daysFromNow | `InventoryFeign` |
| `getEmployeeAttendance` | dateRange | `HRMFeign` |
| `getForecasting` | productId | `ForecastingService` (existing) |
| `getFraudAlerts` | dateRange | `FraudDetectionService` (existing) |

Full catalog: ~35 read tools covering all 17 domains. Read tools require
the `ai.assistant` permission (granted to all paid plans).

### Write tools (excerpt)

| Tool | Required Permission | Maps to |
|------|-------------------|---------|
| `createPurchaseOrder` | `purchase.create` | `SalesFeign` |
| `adjustStock` | `inventory.adjust` | `InventoryFeign` |
| `createProduct` | `product.create` | `ProductFeign` |
| `createExpense` | `finance.write` | `PaymentFeign` |
| `sendPromotion` | `marketing.create` | `NotificationFeign` |
| `createEmployee` | `hrm.write` | `HRMFeign` |
| `createCustomer` | `customer.create` | `CustomerFeign` |

Full catalog: ~15 write tools. All go through draft→confirm. Write tools
require the specific domain permission (same permissions already defined
in user-service for manual operations in the UI).

### Permission scoping

The tool catalog sent to GPT-4o is filtered to only include tools the
user is authorized to use. A cashier sees a smaller catalog than an owner.
Permissions are enforced server-side — even if the LLM hallucinates a tool
call, the executor rejects it if the user lacks the permission.

---

## Data Shape Rendering

Tool results are typed by shape. The frontend decides visualization.

| Shape | Example | Renders as |
|-------|---------|-----------|
| `time_series` | Daily sales over 7 days | Line or bar chart |
| `ranking` | Top 5 products by revenue | Horizontal bar chart |
| `comparison` | This month vs last month by category | Grouped bar chart |
| `proportion` | Sales by payment method | Donut chart |
| `metric` | Today's total revenue | Big number card with trend arrow |
| `table` | Stock levels by warehouse | Sortable MUI table |
| `text` | Narrative insight | Formatted markdown |

The LLM never generates chart code. It calls a tool, the executor returns
typed data, and the frontend renders the appropriate component from the
existing MUI chart library.

---

## Frontend: Floating Chat Overlay

### UX

- **FAB**: Bottom-right corner, fixed position, z-index above all content.
  Icon: chat bubble. Renders inside `FullLayout` so it persists across
  page navigation.
- **Chat panel**: Slides in from the right, 400px wide, full viewport
  height. Header with title and close button.
- **Streaming**: Tokens appear in real time with a typing indicator.
- **Tool execution**: "Looking up your sales data..." with a pulsing
  progress indicator.
- **Drafts**: Rich preview card showing what will happen, with
  bright confirm and subtle reject buttons.
- **Charts**: Rendered inline in the chat bubble using MUI chart
  components.
- **Keyboard**: `Escape` closes the panel. `Enter` sends (Shift+Enter
  for newline).
- **Responsive**: Full-screen on mobile (width < 600px).

### States

| State | Behavior |
|-------|----------|
| Empty | Greeting with example prompts: "Show me today's sales", "Check low stock items" |
| Loading | Pulsing dots while waiting for first token |
| Streaming | Typing indicator, tokens appear progressively |
| Tool executing | Progress bar with tool name |
| Draft pending | Rich preview card with confirm/reject |
| Error | Red banner with retry button |
| Conversation history | Last 50 messages stored in localStorage, scrollable |

### Component tree

```
FullLayout
└── AssistantProvider (context: open, messages, streaming, drafts)
    ├── ChatFAB (floating button, unread badge)
    └── ChatOverlay (slide-in panel)
        ├── ChatHeader (title, close, new-conversation)
        ├── ChatMessages (virtualized list)
        │   ├── TextBlock
        │   ├── ChartBlock (time_series, ranking, comparison, proportion)
        │   ├── MetricBlock
        │   ├── TableBlock
        │   ├── DraftBlock (confirm/reject buttons)
        │   └── ErrorBlock (retry button)
        └── ChatInput (textarea, send button, stop button during streaming)
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| GPT-4o rate limited | Fallback to DeepSeek, tell user "Using our backup AI" |
| Tool returns error (e.g., DB timeout) | Stream error event, suggest retry |
| Tool execution timeout (>10s) | Cancel tool, return partial results with warning |
| Network drop mid-stream | Reconnect with conversationId, resume from last message |
| Permission denied on tool | Log, tell user "You don't have permission to do that" |
| Draft expires (>5min in Redis) | Tell user "Draft expired, please try again" |
| Invalid tool parameters | Validate before execution, return specific field errors |

---

## Permissions

| Plan | Assistant Access | Write Actions |
|------|-----------------|---------------|
| STARTER | Read-only tools | None |
| BUSINESS | Read-only tools | None |
| PROFESSIONAL | All read tools | All write tools |
| ENTERPRISE | All read tools | All write tools |
| SUPER_ADMIN | All tools across all tenants | All actions, no draft (auto-confirm) |

---

## Infrastructure

- **Redis**: Draft storage (5-minute TTL), conversation context cache
- **SSE**: Spring WebFlux `SseEmitter` or `Flux<ServerSentEvent>`
- **Feign**: Reuse all existing service clients in ai-service
- **AiInvocation**: Every tool call and LLM round-trip logged for billing

No new databases, queues, or services. Redis is already in use (gateway rate
limiting, auth-service sessions).

---

## What This Is NOT

- **Not an MCP server.** The assistant is embedded inside LetisPOS. MCP
  (exposing tools to external LLMs) is a separate future project.
- **Not a replacement for existing AI pages.** The standalone
  AiInsightsPage, DemandForecastingPage, etc. remain available as
  dedicated experiences.
- **Not agentic.** The assistant uses tool calling, not autonomous
  planning loops. A planning layer can be added later on top of the
  tool foundation.
- **Not multi-tenant in a single conversation.** Each user's session
  is scoped to their active tenant. Switching tenants starts a new
  conversation.
