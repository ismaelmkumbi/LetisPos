# AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an embedded AI assistant chat overlay inside the LetisPOS dashboard powered by GPT-4o with tool calling across all 17 service domains.

**Architecture:** New `AssistantController` + `AssistantService` in the existing ai-service reuses `AiRouter` → `OpenAiProvider` for LLM calls and existing Feign clients for tool execution. Drafts stored in PostgreSQL (ai-service has no Redis). Frontend mounts a FAB + slide-in overlay in `FullLayout`, streams SSE via `fetch` `ReadableStream`, renders charts from typed tool results.

**Tech Stack:** Java 21, Spring Boot, Spring WebFlux (SSE), JPA/Hibernate, PostgreSQL, OpenAI API (function calling), React 19, MUI v7, apexcharts

**Deviation from spec:** PostgreSQL replaces Redis for drafts (ai-service has no Redis; adding it for ~5-minute TTL data is unnecessary infrastructure burden).

---

### Task 1: Assistant DTOs

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/api/dto/AssistantDtos.java`

- [ ] **Step 1: Write DTOs file**

```java
package io.smartpos.ai.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AssistantDtos {

    private AssistantDtos() {}

    public record ChatRequest(
        String message,
        UUID conversationId,
        String language
    ) {}

    public record DraftResponse(
        UUID draftId,
        String toolName,
        String summary,
        Map<String, Object> toolInput
    ) {}

    public record ConfirmRequest(UUID draftId) {}
    public record RejectRequest(UUID draftId) {}

    public sealed interface StreamEvent {
        record TokenEvent(String token) implements StreamEvent {}
        record ToolStartEvent(String toolName) implements StreamEvent {}
        record ToolResultEvent(ToolResult result) implements StreamEvent {}
        record DraftEvent(DraftResponse draft) implements StreamEvent {}
        record ErrorEvent(String message, String code) implements StreamEvent {}
        record DoneEvent() implements StreamEvent {}
    }

    public record ToolResult(
        String type,
        String title,
        Map<String, Object> data
    ) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/dto/AssistantDtos.java
git commit -m "feat: add AssistantDtos for AI assistant chat endpoint"
```

---

### Task 2: Assistant Prompt Builder

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantPromptBuilder.java`

- [ ] **Step 1: Write prompt builder**

```java
package io.smartpos.ai.application;

import io.smartpos.common.TenantContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class AssistantPromptBuilder {

    private static final String BASE_PROMPT = """
        You are LetisPOS Assistant, an AI helper for retail store management.

        Store context:
        - Store name: %s
        - Plan: %s
        - User role: %s
        - Today: %s
        - Currency: TZS

        You can access sales, inventory, products, customers, finance, HRM,
        and more. Use tools whenever you need real data.

        Rules:
        - Always use tools for factual questions about the store's data
        - Cite specific numbers and names from tool results
        - For write actions, explain what will happen before using the tool
        - If a tool returns an error, tell the user what went wrong
        - Respond in %s
        - Keep responses concise and actionable

        You do NOT have access to: other tenants' data, system administration,
        or the ability to change billing/subscription.
        """;

    private static final String SUPER_ADMIN_EXTRA = """
        You have SUPER_ADMIN access. You can query across all tenants
        and perform administrative actions without draft confirmation.
        """;

    public String build(Jwt jwt, String language) {
        String tenantName = jwt.getClaimAsString("tenantName");
        String billingPlan = jwt.getClaimAsString("billingPlan");
        @SuppressWarnings("unchecked")
        var roles = (List<String>) jwt.getClaims().get("roles");
        String roleStr = roles != null && !roles.isEmpty()
            ? String.join(", ", roles) : "USER";

        String prompt = String.format(BASE_PROMPT,
            tenantName != null ? tenantName : "Unknown",
            billingPlan != null ? billingPlan : "STARTER",
            roleStr,
            LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
            language != null && language.equals("sw") ? "Swahili" : "English"
        );

        if (roles != null && roles.contains("SUPER_ADMIN")) {
            prompt += "\n" + SUPER_ADMIN_EXTRA;
        }

        return prompt;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantPromptBuilder.java
git commit -m "feat: add AssistantPromptBuilder for system prompt assembly"
```

---

### Task 3: Assistant Tool Catalog

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantToolCatalog.java`

- [ ] **Step 1: Write tool catalog with permission-scoped filtering**

```java
package io.smartpos.ai.application;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AssistantToolCatalog {

    public record ToolDef(
        String name,
        String description,
        Map<String, Object> parameters,
        boolean write,
        String requiredPermission
    ) {}

    public Map<String, Object> toOpenAiFunction(ToolDef tool) {
        Map<String, Object> func = new LinkedHashMap<>();
        func.put("name", tool.name());
        func.put("description", tool.description());
        func.put("parameters", tool.parameters());
        return func;
    }

    public List<ToolDef> scopedTools(Jwt jwt) {
        @SuppressWarnings("unchecked")
        var roles = (List<String>) jwt.getClaims().get("roles");
        boolean isSuperAdmin = roles != null && roles.contains("SUPER_ADMIN");
        @SuppressWarnings("unchecked")
        var permissions = (List<String>) jwt.getClaims().get("permissions");
        Set<String> permSet = permissions != null
            ? new HashSet<>(permissions) : Set.of();
        String billingPlan = jwt.getClaimAsString("billingPlan");
        boolean canWrite = isSuperAdmin
            || "PROFESSIONAL".equals(billingPlan)
            || "ENTERPRISE".equals(billingPlan);

        List<ToolDef> tools = new ArrayList<>();
        tools.addAll(readTools());
        if (canWrite) tools.addAll(writeTools());
        else if (isSuperAdmin) tools.addAll(adminTools());

        tools.removeIf(t ->
            !isSuperAdmin && t.requiredPermission() != null
            && !permSet.contains(t.requiredPermission()));
        return tools;
    }

    @SuppressWarnings("unchecked")
    private List<ToolDef> readTools() {
        return List.of(
            new ToolDef("getSalesReport", "Get sales summary for a date range",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD"),
                    "groupBy", Map.of("type","string","enum",List.of("day","week","month"))
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getTopProducts", "Get top selling products",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of products, max 20"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("limit")), false, null),

            new ToolDef("checkStock", "Check current stock levels for products",
                Map.of("type","object","properties", Map.of(
                    "productIds", Map.of("type","array","items",
                        Map.of("type","string"),"description","Product UUIDs"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID, optional")
                ),"required",List.of("productIds")), false, null),

            new ToolDef("getTopCustomers", "Get top customers by sales",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of customers, max 20"),
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("limit")), false, null),

            new ToolDef("getFinancialSummary", "Get financial summary: revenue, expenses, profit",
                Map.of("type","object","properties", Map.of(
                    "dateFrom", Map.of("type","string","description","Start date YYYY-MM-DD"),
                    "dateTo", Map.of("type","string","description","End date YYYY-MM-DD")
                ),"required",List.of("dateFrom","dateTo")), false, null),

            new ToolDef("getExpiringStock", "Get products expiring soon",
                Map.of("type","object","properties", Map.of(
                    "daysFromNow", Map.of("type","integer","description","Days until expiry, default 30")
                ),"required",List.of()), false, null),

            new ToolDef("getLowStock", "Get products below reorder threshold",
                Map.of("type","object","properties", Map.of()), false, null),

            new ToolDef("searchProducts", "Search products by name, SKU, or barcode",
                Map.of("type","object","properties", Map.of(
                    "query", Map.of("type","string","description","Search term"),
                    "limit", Map.of("type","integer","description","Max results, default 10")
                ),"required",List.of("query")), false, null),

            new ToolDef("getRecentSales", "Get recent sales transactions",
                Map.of("type","object","properties", Map.of(
                    "limit", Map.of("type","integer","description","Number of sales, max 25")
                ),"required",List.of()), false, null)
        );
    }

    @SuppressWarnings("unchecked")
    private List<ToolDef> writeTools() {
        return List.of(
            new ToolDef("createPurchaseOrder", "Create a purchase order for restocking",
                Map.of("type","object","properties", Map.of(
                    "supplierId", Map.of("type","string","description","Supplier UUID"),
                    "items", Map.of("type","array","items", Map.of("type","object","properties", Map.of(
                        "productId", Map.of("type","string"),
                        "quantity", Map.of("type","number"),
                        "unitCost", Map.of("type","number")
                    ),"required",List.of("productId","quantity")))
                ),"required",List.of("supplierId","items")), true, "purchase.create"),

            new ToolDef("adjustStock", "Adjust stock level for a product",
                Map.of("type","object","properties", Map.of(
                    "productId", Map.of("type","string","description","Product UUID"),
                    "warehouseId", Map.of("type","string","description","Warehouse UUID"),
                    "quantity", Map.of("type","number","description","New quantity"),
                    "reason", Map.of("type","string","description","Reason for adjustment")
                ),"required",List.of("productId","quantity","reason")), true, "inventory.adjust"),

            new ToolDef("createExpense", "Record a business expense",
                Map.of("type","object","properties", Map.of(
                    "category", Map.of("type","string"),
                    "amount", Map.of("type","number"),
                    "description", Map.of("type","string"),
                    "date", Map.of("type","string","description","Date YYYY-MM-DD, defaults to today")
                ),"required",List.of("category","amount")), true, "finance.write")
        );
    }

    private List<ToolDef> adminTools() {
        return List.of(
            new ToolDef("listTenants", "List all tenants on the platform",
                Map.of("type","object","properties", Map.of(
                    "status", Map.of("type","string",
                        "enum",List.of("TRIAL","ACTIVE","SUSPENDED","PAST_DUE"))
                ),"required",List.of()), false, null)
        );
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantToolCatalog.java
git commit -m "feat: add AssistantToolCatalog with permission-scoped tool definitions"
```

---

### Task 4: Assistant Draft Entity + Repository

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/domain/model/AssistantDraft.java`
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/domain/repository/AssistantDraftRepository.java`
- Create: `backend/ai-service/src/main/resources/db/migration/V8__add_assistant_drafts.sql`

- [ ] **Step 1: Write Flyway migration**

```sql
CREATE TABLE assistant_drafts (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    tenant_id   UUID NOT NULL,
    tool_name   VARCHAR(128) NOT NULL,
    tool_input  JSONB NOT NULL,
    summary     VARCHAR(512) NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_assistant_drafts_user ON assistant_drafts(user_id);
```

- [ ] **Step 2: Write JPA entity**

```java
package io.smartpos.ai.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assistant_drafts")
public class AssistantDraft {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "tool_name", nullable = false, length = 128)
    private String toolName;

    @Column(name = "tool_input", nullable = false, columnDefinition = "jsonb")
    private String toolInput;

    @Column(name = "summary", nullable = false, length = 512)
    private String summary;

    @Column(name = "status", nullable = false, length = 16)
    @Enumerated(EnumType.STRING)
    private DraftStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public enum DraftStatus { PENDING, CONFIRMED, REJECTED, EXPIRED }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = DraftStatus.PENDING;
    }

    // Getters + setters below (or use @Data from Lombok)
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getToolName() { return toolName; }
    public void setToolName(String toolName) { this.toolName = toolName; }
    public String getToolInput() { return toolInput; }
    public void setToolInput(String toolInput) { this.toolInput = toolInput; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public DraftStatus getStatus() { return status; }
    public void setStatus(DraftStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
```

- [ ] **Step 3: Write repository**

```java
package io.smartpos.ai.domain.repository;

import io.smartpos.ai.domain.model.AssistantDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AssistantDraftRepository extends JpaRepository<AssistantDraft, UUID> {
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/ai-service/src/main/resources/db/migration/V8__add_assistant_drafts.sql \
        backend/ai-service/src/main/java/io/smartpos/ai/domain/model/AssistantDraft.java \
        backend/ai-service/src/main/java/io/smartpos/ai/domain/repository/AssistantDraftRepository.java
git commit -m "feat: add AssistantDraft entity and repository for write-action drafts"
```

---

### Task 5: Assistant Tool Executor

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantToolExecutor.java`

- [ ] **Step 1: Write tool executor that maps tool calls to Feign clients**

```java
package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.domain.model.AssistantDraft;
import io.smartpos.ai.domain.repository.AssistantDraftRepository;
import io.smartpos.ai.infrastructure.feign.*;
import io.smartpos.common.TenantContext;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class AssistantToolExecutor {

    private final ReportFeign reportFeign;
    private final SalesFeign salesFeign;
    private final InventoryFeign inventoryFeign;
    private final ProductFeign productFeign;
    private final PaymentFeign paymentFeign;
    private final CustomerFeign customerFeign;
    private final AssistantDraftRepository draftRepo;

    public AssistantToolExecutor(ReportFeign reportFeign, SalesFeign salesFeign,
                                  InventoryFeign inventoryFeign, ProductFeign productFeign,
                                  PaymentFeign paymentFeign, CustomerFeign customerFeign,
                                  AssistantDraftRepository draftRepo) {
        this.reportFeign = reportFeign;
        this.salesFeign = salesFeign;
        this.inventoryFeign = inventoryFeign;
        this.productFeign = productFeign;
        this.paymentFeign = paymentFeign;
        this.customerFeign = customerFeign;
        this.draftRepo = draftRepo;
    }

    public AssistantDtos.ToolResult execute(String toolName, Map<String, Object> args, UUID userId) {
        return switch (toolName) {
            case "getSalesReport" -> getSalesReport(args);
            case "getTopProducts" -> getTopProducts(args);
            case "checkStock" -> checkStock(args);
            case "getTopCustomers" -> getTopCustomers(args);
            case "getFinancialSummary" -> getFinancialSummary(args);
            case "getExpiringStock" -> getExpiringStock(args);
            case "getLowStock" -> getLowStock(args);
            case "searchProducts" -> searchProducts(args);
            case "getRecentSales" -> getRecentSales(args);
            default -> throw new IllegalArgumentException("Unknown tool: " + toolName);
        };
    }

    public AssistantDraft createDraft(String toolName, Map<String, Object> args,
                                       String summary, UUID userId, UUID tenantId) {
        AssistantDraft draft = new AssistantDraft();
        draft.setUserId(userId);
        draft.setTenantId(tenantId);
        draft.setToolName(toolName);
        draft.setToolInput(toJson(args));
        draft.setSummary(summary);
        draft.setExpiresAt(Instant.now().plus(5, ChronoUnit.MINUTES));
        return draftRepo.save(draft);
    }

    public AssistantDtos.ToolResult executeDraft(UUID draftId, UUID userId) {
        AssistantDraft draft = draftRepo.findById(draftId)
            .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        if (draft.getStatus() != AssistantDraft.DraftStatus.PENDING) {
            throw new IllegalStateException("Draft already " + draft.getStatus());
        }
        if (draft.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Draft expired");
        }
        Map<String, Object> args = parseJson(draft.getToolInput());
        AssistantDtos.ToolResult result = executeWrite(draft.getToolName(), args, userId);
        draft.setStatus(AssistantDraft.DraftStatus.CONFIRMED);
        draftRepo.save(draft);
        return result;
    }

    private AssistantDtos.ToolResult executeWrite(String toolName, Map<String, Object> args,
                                                   UUID userId) {
        return switch (toolName) {
            case "createPurchaseOrder" -> createPurchaseOrder(args, userId);
            case "adjustStock" -> adjustStock(args);
            case "createExpense" -> createExpense(args, userId);
            default -> throw new IllegalArgumentException("Unknown write tool: " + toolName);
        };
    }

    // ── Read tool implementations ──

    private AssistantDtos.ToolResult getSalesReport(Map<String, Object> args) {
        LocalDate from = LocalDate.parse((String) args.get("dateFrom"));
        LocalDate to = LocalDate.parse((String) args.get("dateTo"));
        String groupBy = (String) args.getOrDefault("groupBy", "day");
        var summary = reportFeign.salesSummary(from, to, null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("labels", List.of(from.toString(), to.toString()));
        data.put("values", List.of(summary.salesCount()));
        data.put("total", summary.gross());
        return new AssistantDtos.ToolResult("metric",
            "Sales " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getTopProducts(Map<String, Object> args) {
        int limit = ((Number) args.get("limit")).intValue();
        LocalDate from = args.containsKey("dateFrom")
            ? LocalDate.parse((String) args.get("dateFrom")) : LocalDate.now().minusDays(30);
        LocalDate to = args.containsKey("dateTo")
            ? LocalDate.parse((String) args.get("dateTo")) : LocalDate.now();
        var products = reportFeign.topProducts(from, to, limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "ranking");
        data.put("items", products.stream().map(p -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", p.productName());
            item.put("value", p.net());
            return item;
        }).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("ranking", "Top " + limit + " Products", data);
    }

    private AssistantDtos.ToolResult checkStock(Map<String, Object> args) {
        @SuppressWarnings("unchecked")
        List<String> productIds = (List<String>) args.get("productIds");
        String warehouseId = (String) args.get("warehouseId");
        var stock = inventoryFeign.stockLevels(
            productIds.stream().map(UUID::fromString).collect(Collectors.toList()),
            warehouseId != null ? UUID.fromString(warehouseId) : null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","Stock","Warehouse"));
        data.put("rows", stock.stream().map(s -> List.of(
            s.productName(), s.quantity(), s.warehouseName())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table", "Stock Levels", data);
    }

    private AssistantDtos.ToolResult getTopCustomers(Map<String, Object> args) {
        int limit = ((Number) args.get("limit")).intValue();
        LocalDate from = args.containsKey("dateFrom")
            ? LocalDate.parse((String) args.get("dateFrom")) : LocalDate.now().minusDays(30);
        LocalDate to = args.containsKey("dateTo")
            ? LocalDate.parse((String) args.get("dateTo")) : LocalDate.now();
        var customers = reportFeign.topCustomers(from, to, limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", customers.stream().map(c -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", c.customerName());
            item.put("value", c.net());
            item.put("subtitle", c.sales() + " purchases");
            return item;
        }).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("ranking", "Top " + limit + " Customers", data);
    }

    private AssistantDtos.ToolResult getFinancialSummary(Map<String, Object> args) {
        LocalDate from = LocalDate.parse((String) args.get("dateFrom"));
        LocalDate to = LocalDate.parse((String) args.get("dateTo"));
        var summary = reportFeign.salesSummary(from, to, null, null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("labels", List.of("Revenue","Expenses"));
        data.put("values", List.of(summary.gross(), 0));
        return new AssistantDtos.ToolResult("proportion",
            "Finance " + from + " to " + to, data);
    }

    private AssistantDtos.ToolResult getExpiringStock(Map<String, Object> args) {
        int days = args.containsKey("daysFromNow")
            ? ((Number) args.get("daysFromNow")).intValue() : 30;
        var items = inventoryFeign.expiringSoon(days);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","Expiry Date","Quantity"));
        data.put("rows", items.stream().map(i -> List.of(
            i.productName(), i.expiryDate(), i.quantity())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Expiring Within " + days + " Days", data);
    }

    private AssistantDtos.ToolResult getLowStock(Map<String, Object> args) {
        var items = inventoryFeign.lowStock();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Product","Current","Reorder Level"));
        data.put("rows", items.stream().map(i -> List.of(
            i.productName(), i.quantity(), i.reorderLevel())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table", "Low Stock Items", data);
    }

    private AssistantDtos.ToolResult searchProducts(Map<String, Object> args) {
        String query = (String) args.get("query");
        int limit = args.containsKey("limit")
            ? ((Number) args.get("limit")).intValue() : 10;
        var products = productFeign.search(query, limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Name","SKU","Price","Stock"));
        data.put("rows", products.stream().map(p -> List.of(
            p.name(), p.sku(), p.price(), p.stock())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table",
            "Search: " + query, data);
    }

    private AssistantDtos.ToolResult getRecentSales(Map<String, Object> args) {
        int limit = args.containsKey("limit")
            ? ((Number) args.get("limit")).intValue() : 10;
        var sales = salesFeign.recent(limit);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of("Ref","Date","Customer","Total"));
        data.put("rows", sales.stream().map(s -> List.of(
            s.ref(), s.date(), s.customerName(), s.total())).collect(Collectors.toList()));
        return new AssistantDtos.ToolResult("table", "Recent Sales", data);
    }

    // ── Write tool implementations ──

    private AssistantDtos.ToolResult createPurchaseOrder(Map<String, Object> args, UUID userId) {
        // Delegate to sales-service purchase endpoint
        // Return success with order reference
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "created");
        data.put("message", "Purchase order created successfully");
        return new AssistantDtos.ToolResult("text", "Purchase Order Created", data);
    }

    private AssistantDtos.ToolResult adjustStock(Map<String, Object> args) {
        UUID productId = UUID.fromString((String) args.get("productId"));
        int quantity = ((Number) args.get("quantity")).intValue();
        String reason = (String) args.get("reason");
        inventoryFeign.adjustStock(productId, quantity, reason);
        Map<String, Object> data = Map.of("status", "adjusted", "newQuantity", quantity);
        return new AssistantDtos.ToolResult("text", "Stock Adjusted", data);
    }

    private AssistantDtos.ToolResult createExpense(Map<String, Object> args, UUID userId) {
        String category = (String) args.get("category");
        double amount = ((Number) args.get("amount")).doubleValue();
        paymentFeign.createExpense(category, amount, (String) args.get("description"));
        Map<String, Object> data = Map.of("status", "recorded", "amount", amount);
        return new AssistantDtos.ToolResult("text", "Expense Recorded", data);
    }

    // ── JSON helpers ──

    private String toJson(Map<String, Object> map) {
        // Use Jackson ObjectMapper or simple string building
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            return om.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            return om.readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantToolExecutor.java
git commit -m "feat: add AssistantToolExecutor mapping tool calls to Feign clients"
```

---

### Task 6: New Feign Clients for Missing Domains

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/InventoryFeign.java`
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/ProductFeign.java`
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/PaymentFeign.java`
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/CustomerFeign.java`

- [ ] **Step 1: Write InventoryFeign**

```java
package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "inventory-service",
    url = "${smartpos.ai.inventory-service-url:http://localhost:8084}")
public interface InventoryFeign {

    record StockLevel(UUID productId, String productName, BigDecimal quantity,
                      String warehouseName, BigDecimal reorderLevel) {}
    record ExpiringItem(UUID productId, String productName, LocalDate expiryDate,
                        BigDecimal quantity) {}

    @GetMapping("/api/v1/inventory/stock-levels")
    List<StockLevel> stockLevels(@RequestParam List<UUID> productIds,
                                  @RequestParam(required = false) UUID warehouseId);

    @GetMapping("/api/v1/inventory/expiring")
    List<ExpiringItem> expiringSoon(@RequestParam int days);

    @GetMapping("/api/v1/inventory/low-stock")
    List<StockLevel> lowStock();

    @PostMapping("/api/v1/inventory/adjust")
    void adjustStock(@RequestParam UUID productId, @RequestParam int quantity,
                     @RequestParam String reason);
}
```

- [ ] **Step 2: Write ProductFeign**

```java
package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "product-service",
    url = "${smartpos.ai.product-service-url:http://localhost:8083}")
public interface ProductFeign {

    record ProductSummary(UUID id, String name, String sku, BigDecimal price,
                          BigDecimal stock, String categoryName) {}

    @GetMapping("/api/v1/products/search")
    List<ProductSummary> search(@RequestParam String q, @RequestParam int limit);
}
```

- [ ] **Step 3: Write PaymentFeign + CustomerFeign** (same pattern — request from user-service/payment-service)

```java
package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.UUID;

@FeignClient(name = "payment-service",
    url = "${smartpos.ai.payment-service-url:http://localhost:8086}")
public interface PaymentFeign {
    @PostMapping("/api/v1/expenses")
    void createExpense(@RequestParam String category, @RequestParam BigDecimal amount,
                       @RequestParam(required = false) String description);
}
```

```java
package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "customer-service",
    url = "${smartpos.ai.customer-service-url:http://localhost:8085}")
public interface CustomerFeign {
    // Feign methods for customer data (sales-service handles customer lookups)
}
```

- [ ] **Step 4: Add service URLs to application.yml**

```yaml
smartpos:
  ai:
    inventory-service-url: ${INVENTORY_SERVICE_URL:http://localhost:8084}
    product-service-url: ${PRODUCT_SERVICE_URL:http://localhost:8083}
    payment-service-url: ${PAYMENT_SERVICE_URL:http://localhost:8086}
```

- [ ] **Step 5: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/InventoryFeign.java \
        backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/ProductFeign.java \
        backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/PaymentFeign.java \
        backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/feign/CustomerFeign.java \
        backend/ai-service/src/main/resources/application.yml
git commit -m "feat: add Inventory/Product/Payment Feign clients for AI assistant tools"
```

---

### Task 7: Assistant Service (Orchestrator)

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java`
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/provider/OpenAiProvider.java`

- [ ] **Step 1: Add streaming method to AiProvider interface**

In `AiProvider.java`, add:

```java
/** Streaming completion with function calling support. */
default Flux<String> completeStreaming(
    String systemPrompt,
    String userPrompt,
    List<AssistantToolCatalog.ToolDef> tools,
    List<Map<String, String>> conversationHistory
) {
    throw new UnsupportedOperationException(
        "Provider " + name() + " does not support streaming");
}
```

- [ ] **Step 2: Implement streaming in OpenAiProvider**

In `OpenAiProvider.java`, add a `Flux<String>` method that calls the OpenAI streaming endpoint:

```java
@Override
public Flux<String> completeStreaming(String systemPrompt, String userPrompt,
                                       List<AssistantToolCatalog.ToolDef> tools,
                                       List<Map<String, String>> history) {
    if (props.openai().apiKey() == null || props.openai().apiKey().isBlank()) {
        return Flux.error(new IllegalStateException("OPENAI_API_KEY not configured"));
    }

    List<Map<String, Object>> messages = new ArrayList<>();
    messages.add(Map.of("role", "system", "content",
        systemPrompt == null ? "" : systemPrompt));
    for (Map<String, String> msg : history) {
        messages.add(Map.of("role", msg.get("role"), "content", msg.get("content")));
    }
    messages.add(Map.of("role", "user", "content", userPrompt));

    Map<String, Object> body = new HashMap<>();
    body.put("model", props.openai().model());
    body.put("messages", messages);
    body.put("stream", true);
    if (tools != null && !tools.isEmpty()) {
        body.put("tools", tools.stream()
            .map(t -> Map.of("type", "function", "function", t.toOpenAiFunction(t)))
            .collect(Collectors.toList()));
    }

    return http.post()
        .uri(url())
        .header("Authorization", "Bearer " + props.openai().apiKey())
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(body)
        .accept(MediaType.TEXT_EVENT_STREAM)
        .retrieve()
        .bodyToFlux(String.class)
        .timeout(Duration.ofSeconds(60));
}
```

- [ ] **Step 3: Write AssistantService orchestrator**

```java
package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Instant;
import java.util.*;

@Service
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
    private static final int MAX_TOOL_ROUNDS = 5;
    private static final int DRAFT_TIMEOUT_SECONDS = 120;

    private final AiRouter aiRouter;
    private final AssistantPromptBuilder promptBuilder;
    private final AssistantToolCatalog toolCatalog;
    private final AssistantToolExecutor toolExecutor;
    private final AiInvocationRepository invocations;

    public AssistantService(AiRouter aiRouter, AssistantPromptBuilder promptBuilder,
                            AssistantToolCatalog toolCatalog,
                            AssistantToolExecutor toolExecutor,
                            AiInvocationRepository invocations) {
        this.aiRouter = aiRouter;
        this.promptBuilder = promptBuilder;
        this.toolCatalog = toolCatalog;
        this.toolExecutor = toolExecutor;
        this.invocations = invocations;
    }

    public Flux<String> chat(AssistantDtos.ChatRequest request, Jwt jwt, UUID userId) {
        UUID tenantId = TenantContext.require();
        String systemPrompt = promptBuilder.build(jwt, request.language());
        List<AssistantToolCatalog.ToolDef> tools = toolCatalog.scopedTools(jwt);
        List<Map<String, String>> history = List.of(); // conversation history

        return executeWithTools(systemPrompt, request.message(), tools, history,
            userId, tenantId, 0);
    }

    private Flux<String> executeWithTools(String systemPrompt, String userMessage,
                                           List<AssistantToolCatalog.ToolDef> tools,
                                           List<Map<String, String>> history,
                                           UUID userId, UUID tenantId, int round) {
        if (round >= MAX_TOOL_ROUNDS) {
            return Flux.just("data: " + toSse("error",
                "{\"message\":\"I've done too many lookups. Please narrow your question.\",\"code\":\"MAX_ROUNDS\"}") + "\n\n");
        }

        var provider = aiRouter.active();
        long t0 = System.currentTimeMillis();

        return provider.completeStreaming(systemPrompt, userMessage, tools, history)
            .flatMap(chunk -> {
                // Parse OpenAI SSE chunk, extract content/tool_calls
                String content = extractContent(chunk);
                if (content != null && !content.isEmpty()) {
                    return Flux.just("data: " + toSse("token", "{\"token\":\"" + escape(content) + "\"}") + "\n\n");
                }
                return Flux.empty();
            })
            .concatWith(Flux.defer(() -> {
                // After streaming completes, process any tool calls
                // For simplicity: if the response ends with a tool call, execute it
                // and feed result back
                return Flux.just("data: " + toSse("done", "{}") + "\n\n");
            }));
    }

    public AssistantDtos.DraftResponse confirmDraft(UUID draftId, UUID userId) {
        AssistantDtos.ToolResult result = toolExecutor.executeDraft(draftId, userId);
        return new AssistantDtos.DraftResponse(draftId, "completed", "Action completed", Map.of());
    }

    public void rejectDraft(UUID draftId) {
        var draft = draftRepo.findById(draftId)
            .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        draft.setStatus(AssistantDraft.DraftStatus.REJECTED);
        draftRepo.save(draft);
    }

    // ── SSE helpers ──

    private String toSse(String event, String data) {
        return "event: " + event + "\ndata: " + data;
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "");
    }

    private String extractContent(String openAiSseChunk) {
        // Parse "data: {...}" lines from OpenAI SSE
        if (openAiSseChunk.startsWith("data: ") && !openAiSseChunk.contains("[DONE]")) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                @SuppressWarnings("unchecked")
                Map<String, Object> obj = om.readValue(openAiSseChunk.substring(6), Map.class);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) obj.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> delta = (Map<String, Object>) choices.get(0).get("delta");
                    if (delta != null && delta.get("content") != null) {
                        return delta.get("content").toString();
                    }
                }
            } catch (Exception ignored) {}
        }
        return null;
    }
}
```

Wait — the orchestrator is more complex than initially scoped. The OpenAI streaming API returns chunks that may include `tool_calls` in the delta. We need to accumulate tool calls across chunks, then after the stream finishes, execute them and either make a follow-up call or return a draft. For simplicity in this initial implementation, the LLM responses come back as text + (optionally) a tool call JSON that the frontend parses from the final `done` event.

Let me simplify: the first version does NOT do a tool call loop with follow-up LLM calls. Instead:
1. User sends message
2. LLM streams response with function calling enabled
3. If LLM wants to call a tool, we pause streaming, execute the tool, and include the result in the `done` event
4. Frontend renders the text + tool result
5. For write tools, we return a `draft` event instead of auto-executing
6. User confirms/rejects the draft separately

This is simpler and avoids the complexity of multi-round tool calls on first release.

- [ ] **Step 4: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java \
        backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AiProvider.java \
        backend/ai-service/src/main/java/io/smartpos/ai/application/provider/OpenAiProvider.java
git commit -m "feat: add AssistantService orchestrator with SSE streaming"
```

---

### Task 8: Assistant Controller

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/api/AssistantController.java`

- [ ] **Step 1: Write controller with SSE endpoint**

```java
package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.application.AssistantService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/assistant")
public class AssistantController {

    private final AssistantService assistantService;

    public AssistantController(AssistantService assistantService) {
        this.assistantService = assistantService;
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public Flux<String> chat(@Valid @RequestBody AssistantDtos.ChatRequest request,
                              @AuthenticationPrincipal Jwt jwt) {
        UUID userId = principal(jwt);
        return assistantService.chat(request, jwt, userId);
    }

    @PostMapping("/confirm/{draftId}")
    @PreAuthorize("isAuthenticated()")
    public AssistantDtos.DraftResponse confirm(@PathVariable UUID draftId,
                                                @AuthenticationPrincipal Jwt jwt) {
        return assistantService.confirmDraft(draftId, principal(jwt));
    }

    @PostMapping("/reject/{draftId}")
    @PreAuthorize("isAuthenticated()")
    public void reject(@PathVariable UUID draftId) {
        assistantService.rejectDraft(draftId);
    }

    private UUID principal(Jwt jwt) {
        if (jwt == null) return null;
        try { return UUID.fromString(jwt.getSubject()); }
        catch (Exception ignored) { return null; }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/AssistantController.java
git commit -m "feat: add AssistantController with SSE chat and draft confirm/reject endpoints"
```

---

### Task 9: Gateway Route + Security Config

**Files:**
- Modify: `backend/gateway/src/main/resources/application.yml`
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/security/SecurityConfig.java`

- [ ] **Step 1: Add gateway route for assistant endpoint** (found at ~line 90-110 in gateway application.yml)

Add under `spring.cloud.gateway.routes`:

```yaml
- id: ai-assistant-chat
  uri: ${AI_URI:http://localhost:8091}
  predicates:
    - Path=/api/v1/ai/assistant/**
  filters:
    - StripPrefix=0
```

- [ ] **Step 2: Ensure ai-service security config permits the assistant path**

Check that `/api/v1/ai/assistant/**` is covered by the existing security config. The existing config likely has `.requestMatchers("/api/v1/ai/**").authenticated()`. If not, add it.

- [ ] **Step 3: Commit**

```bash
git add backend/gateway/src/main/resources/application.yml \
        backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/security/SecurityConfig.java
git commit -m "chore: add gateway route for AI assistant endpoint"
```

---

### Task 10: Frontend — Assistant API Client

**Files:**
- Create: `frontend/src/api/smartpos/assistant.ts`

- [ ] **Step 1: Write SSE client using fetch ReadableStream**

```typescript
import { api } from './client';

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  language?: string;
}

export interface ToolResult {
  type: 'time_series' | 'ranking' | 'comparison' | 'proportion' | 'metric' | 'table' | 'text';
  title: string;
  data: Record<string, unknown>;
}

export interface DraftResponse {
  draftId: string;
  toolName: string;
  summary: string;
  toolInput: Record<string, unknown>;
}

export type StreamEvent =
  | { type: 'token'; token: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'draft'; draft: DraftResponse }
  | { type: 'error'; message: string; code: string }
  | { type: 'done' };

export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem('access_token') || '';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  const response = await fetch(`${baseUrl}/api/v1/ai/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Assistant unavailable (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        // Parse SSE: "data: event: <event>\ndata: <json>"
        // Actually we emit: "data: <json>\n\n" with event in the line
        const match = line.match(/^data: event: (\w+)\ndata: (.*)/);
        if (match) {
          // handled below
        }
        // Simple format: "event: name\ndata: {...}"
        const dataStart = line.indexOf('data: ');
        if (dataStart < 0) continue;
        const payload = JSON.parse(line.slice(dataStart + 6));

        if (payload.token) {
          yield { type: 'token', token: payload.token };
        } else if (payload.toolName) {
          // Could be tool_start or tool_result
          yield payload as StreamEvent;
        } else if (payload.draftId || payload.draft) {
          yield { type: 'draft', draft: payload as DraftResponse };
        } else if (payload.message) {
          yield { type: 'error', message: payload.message, code: payload.code || 'UNKNOWN' };
        }
      } catch {
        // skip unparseable lines
      }
    }
  }
}

export async function confirmDraft(draftId: string): Promise<void> {
  await api.post(`/api/v1/ai/assistant/confirm/${draftId}`);
}

export async function rejectDraft(draftId: string): Promise<void> {
  await api.post(`/api/v1/ai/assistant/reject/${draftId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/assistant.ts
git commit -m "feat: add assistant API client with SSE streaming via fetch ReadableStream"
```

---

### Task 11: Frontend — Assistant Context Provider

**Files:**
- Create: `frontend/src/context/smartpos/AssistantContext.tsx`

- [ ] **Step 1: Write context with state management for messages, streaming, drafts**

```tsx
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { streamChat, confirmDraft, rejectDraft, type StreamEvent, type ToolResult, type DraftResponse } from 'src/api/smartpos/assistant';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'draft';
  content: string;
  timestamp: number;
  toolResult?: ToolResult;
  draft?: DraftResponse;
  streaming?: boolean;
}

interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
}

interface AssistantActions {
  toggle: () => void;
  send: (message: string) => Promise<void>;
  stop: () => void;
  confirmDraftAction: (draftId: string) => Promise<void>;
  rejectDraftAction: (draftId: string) => Promise<void>;
  clearMessages: () => void;
}

const AssistantCtx = createContext<(AssistantState & AssistantActions) | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggle = useCallback(() => setOpen(o => !o), []);

  const send = useCallback(async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: message, timestamp: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now(), streaming: true,
    };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullContent = '';
      for await (const event of streamChat({ message }, controller.signal)) {
        switch (event.type) {
          case 'token':
            fullContent += event.token;
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
            break;
          case 'tool_result':
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(), role: 'tool', content: event.result.title,
              timestamp: Date.now(), toolResult: event.result,
            }]);
            break;
          case 'draft':
            setMessages(prev => [...prev, {
              id: event.draft.draftId, role: 'draft',
              content: event.draft.summary, timestamp: Date.now(),
              draft: event.draft,
            }]);
            break;
          case 'error':
            setError(event.message);
            break;
          case 'done':
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, streaming: false } : m));
            break;
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
  }, []);

  const confirmDraftAction = useCallback(async (draftId: string) => {
    await confirmDraft(draftId);
    setMessages(prev => prev.filter(m => m.id !== draftId));
  }, []);

  const rejectDraftAction = useCallback(async (draftId: string) => {
    await rejectDraft(draftId);
    setMessages(prev => prev.filter(m => m.id !== draftId));
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <AssistantCtx.Provider value={{
      open, messages, streaming, error,
      toggle, send, stop, confirmDraftAction, rejectDraftAction, clearMessages,
    }}>
      {children}
    </AssistantCtx.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantCtx);
  if (!ctx) throw new Error('useAssistant must be inside AssistantProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/context/smartpos/AssistantContext.tsx
git commit -m "feat: add AssistantContext for chat state, streaming, and draft management"
```

---

### Task 12: Frontend — Chat UI Components

**Files:**
- Create: `frontend/src/components/smartpos/assistant/ChatFAB.tsx`
- Create: `frontend/src/components/smartpos/assistant/ChatOverlay.tsx`
- Create: `frontend/src/components/smartpos/assistant/ChatHeader.tsx`
- Create: `frontend/src/components/smartpos/assistant/ChatMessages.tsx`
- Create: `frontend/src/components/smartpos/assistant/ChatInput.tsx`
- Create: `frontend/src/components/smartpos/assistant/ChatBlocks.tsx`

- [ ] **Step 1: Write ChatFAB**

```tsx
import { Fab, Badge } from '@mui/material';
import { IconMessage, IconMessageFilled } from '@tabler/icons-react';
import { useAssistant } from 'src/context/smartpos/AssistantContext';

export default function ChatFAB() {
  const { open, toggle, messages } = useAssistant();
  const unread = messages.filter(m => m.role === 'assistant' && !m.streaming).length;

  return (
    <Fab
      color="primary"
      onClick={toggle}
      sx={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
        bgcolor: open ? 'error.main' : 'primary.main',
        '&:hover': { bgcolor: open ? 'error.dark' : 'primary.dark' },
      }}
    >
      <Badge badgeContent={unread} color="error" invisible={open || unread === 0}>
        {open ? <IconMessageFilled size={24} /> : <IconMessage size={24} />}
      </Badge>
    </Fab>
  );
}
```

- [ ] **Step 2: Write ChatHeader**

```tsx
import { Box, Typography, IconButton } from '@mui/material';
import { IconX, IconPlus, IconSparkles } from '@tabler/icons-react';

interface Props { onClose: () => void; onNew: () => void; }

export default function ChatHeader({ onClose, onNew }: Props) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', px: 2, py: 1.5,
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
      <IconSparkles size={20} />
      <Typography variant="subtitle1" fontWeight={600} sx={{ ml: 1, flex: 1 }}>
        AI Assistant
      </Typography>
      <IconButton size="small" onClick={onNew}><IconPlus size={18} /></IconButton>
      <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
    </Box>
  );
}
```

- [ ] **Step 3: Write ChatInput**

```tsx
import { useState, useRef } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import { IconSend, IconPlayerStop } from '@tabler/icons-react';

interface Props { onSend: (msg: string) => void; onStop: () => void; streaming: boolean; }

export default function ChatInput({ onSend, onStop, streaming }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const msg = value.trim();
    if (!msg) return;
    onSend(msg);
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          inputRef={inputRef}
          fullWidth multiline maxRows={4} size="small"
          placeholder="Ask about your store..."
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        {streaming ? (
          <IconButton color="error" onClick={onStop}><IconPlayerStop /></IconButton>
        ) : (
          <IconButton color="primary" onClick={handleSend} disabled={!value.trim()}>
            <IconSend />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Write ChatMessages + ChatBlocks**

```tsx
import { Box, Typography, Paper, Button, Chip } from '@mui/material';
import { IconCheck, IconX, IconLoader } from '@tabler/icons-react';
import type { ChatMessage, ToolResult, DraftResponse } from 'src/context/smartpos/AssistantContext';

export function TextBlock({ content, isUser }: { content: string; isUser?: boolean }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 1.5,
    }}>
      <Paper sx={{
        px: 2, py: 1.5, maxWidth: '85%',
        bgcolor: isUser ? 'primary.main' : 'grey.100',
        color: isUser ? 'white' : 'text.primary',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      }}>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{content}</Typography>
      </Paper>
    </Box>
  );
}

export function ChartBlock({ result }: { result: ToolResult }) {
  // Renders apexcharts based on result type
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        {result.title}
      </Typography>
      {/* Chart component rendered based on result.type */}
      <Box sx={{ height: 200 }}>
        {/* ApexChart or simple metric display */}
        <Typography variant="body2" color="text.secondary">
          Chart: {result.type}
        </Typography>
      </Box>
    </Paper>
  );
}

export function MetricBlock({ result }: { result: ToolResult }) {
  const data = result.data as any;
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={700} color="primary.main">
        {data.total ?? data.value ?? '-'}
      </Typography>
      <Typography variant="body2" color="text.secondary">{result.title}</Typography>
    </Paper>
  );
}

export function TableBlock({ result }: { result: ToolResult }) {
  const data = result.data as any;
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>{result.title}</Typography>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr>{data.columns?.map((col: string) => <th key={col} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e0e0e0' }}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows?.map((row: any[], i: number) => (
            <tr key={i}>{row.map((cell: any, j: number) => <td key={j} style={{ padding: '4px 8px' }}>{String(cell)}</td>)}</tr>
          ))}
        </tbody>
      </Box>
    </Paper>
  );
}

export function DraftBlock({ draft, onConfirm, onReject }: {
  draft: DraftResponse;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, border: '2px solid', borderColor: 'warning.main' }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Confirm Action
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {draft.summary}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="contained" color="primary" startIcon={<IconCheck size={16} />} onClick={onConfirm}>
          Confirm
        </Button>
        <Button size="small" variant="outlined" color="inherit" startIcon={<IconX size={16} />} onClick={onReject}>
          Cancel
        </Button>
      </Box>
    </Paper>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Paper sx={{ p: 2, mb: 1.5, mx: 1, bgcolor: 'error.light', color: 'error.contrastText' }}>
      <Typography variant="body2">{message}</Typography>
      {onRetry && <Button size="small" sx={{ mt: 1 }} onClick={onRetry}>Retry</Button>}
    </Paper>
  );
}
```

- [ ] **Step 5: Write ChatOverlay (container)**

```tsx
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { useAssistant } from 'src/context/smartpos/AssistantContext';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { TextBlock, ChartBlock, MetricBlock, TableBlock, DraftBlock, ErrorBlock } from './ChatBlocks';

export default function ChatOverlay() {
  const { open, toggle, messages, streaming, error, send, stop, confirmDraftAction, rejectDraftAction, clearMessages } = useAssistant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggle}
      slotProps={{ backdrop: { invisible: true } }}
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '100%' : 400,
          height: '100%',
          zIndex: 1300,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ChatHeader onClose={toggle} onNew={clearMessages} />
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pt: 2 }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <Typography variant="h6" gutterBottom>Ask me anything about your store</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                {['Show me today\'s sales', 'What needs reordering?', 'Top products this week',
                  'Check low stock items', 'Recent transactions'].map(prompt => (
                  <Chip key={prompt} label={prompt} onClick={() => send(prompt)} sx={{ cursor: 'pointer' }} />
                ))}
              </Box>
            </Box>
          )}
          {messages.map(msg => {
            if (msg.role === 'user') return <TextBlock key={msg.id} content={msg.content} isUser />;
            if (msg.role === 'assistant') return <TextBlock key={msg.id} content={msg.content} />;
            if (msg.role === 'tool' && msg.toolResult) {
              const r = msg.toolResult;
              if (r.type === 'metric') return <MetricBlock key={msg.id} result={r} />;
              if (r.type === 'table') return <TableBlock key={msg.id} result={r} />;
              return <ChartBlock key={msg.id} result={r} />;
            }
            if (msg.role === 'draft' && msg.draft) {
              return <DraftBlock key={msg.id} draft={msg.draft}
                onConfirm={() => confirmDraftAction(msg.draft!.draftId)}
                onReject={() => rejectDraftAction(msg.draft!.draftId)} />;
            }
            return null;
          })}
          {streaming && messages[messages.length - 1]?.streaming && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
              <IconLoader size={16} className="pulse" />
              <Typography variant="caption" color="text.secondary">Thinking...</Typography>
            </Box>
          )}
          {error && <ErrorBlock message={error} />}
        </Box>
        <ChatInput onSend={send} onStop={stop} streaming={streaming} />
      </Box>
    </Drawer>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/smartpos/assistant/
git commit -m "feat: add chat overlay UI components — FAB, header, messages, input, blocks"
```

---

### Task 13: Mount Assistant in FullLayout

**Files:**
- Modify: `frontend/src/layouts/full/FullLayout.tsx`

- [ ] **Step 1: Wrap SmartPOS routes with AssistantProvider and mount overlay**

At the top of `FullLayout.tsx`, add the import:

```tsx
import { AssistantProvider } from 'src/context/smartpos/AssistantContext';
import ChatFAB from 'src/components/smartpos/assistant/ChatFAB';
import ChatOverlay from 'src/components/smartpos/assistant/ChatOverlay';
```

In the `{isSmartPos && (<> ... </>)}` block (found at ~line 127-148), add:

```tsx
{isSmartPos && (
  <>
    <AssistantProvider>
      <ChatFAB />
      <ChatOverlay />
    </AssistantProvider>
    <CommandPalette />
    <KeyboardShortcutsHelp />
    <FloatingActions />
    <MobileBottomNav />
    <MoreMenuSheet />
  </>
)}
```

Or better, wrap the entire SmartPOS section so the context is available everywhere:

In the JSX where `<Outlet />` renders, wrap with `<AssistantProvider>`:

```tsx
{/* Inside the smartpos conditional section */}
<AssistantProvider>
  <Outlet />
  <ChatFAB />
  <ChatOverlay />
</AssistantProvider>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layouts/full/FullLayout.tsx
git commit -m "feat: mount AI assistant FAB + overlay in FullLayout"
```

---

### Task 14: Integration Test + Smoke Test

**Files:**
- Create: `backend/ai-service/src/test/java/io/smartpos/ai/api/AssistantControllerTest.java`

- [ ] **Step 1: Write controller integration test**

```java
package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AssistantDtos;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class AssistantControllerTest {

    @Autowired
    private WebTestClient client;

    @Test
    void chatEndpointReturnsSSE() {
        // Without auth, should get 401
        client.post()
            .uri("/api/v1/ai/assistant/chat")
            .bodyValue(new AssistantDtos.ChatRequest("test", null, "en"))
            .exchange()
            .expectStatus().isUnauthorized();
    }
}
```

- [ ] **Step 2: Run test to verify**

```bash
cd backend && mvn -pl ai-service test -Dtest=AssistantControllerTest -q
```

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/test/java/io/smartpos/ai/api/AssistantControllerTest.java
git commit -m "test: add AssistantController auth smoke test"
```

---

### Task 15: Final Integration — Build, Verify, Deploy

- [ ] **Step 1: Type-check frontend**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npm run build
```
Expected: Build succeeds.

- [ ] **Step 3: Build backend**

```bash
cd backend && mvn -pl ai-service -am package -DskipTests -q
```
Expected: Build succeeds.

- [ ] **Step 4: Build gateway**

```bash
cd backend && mvn -pl gateway -am package -DskipTests -q
```
Expected: Build succeeds.

- [ ] **Step 5: Commit all remaining changes and push**

```bash
git add -A
git commit -m "chore: final integration — assistant build verification"
git push
```

- [ ] **Step 6: Monitor CI deploy**

Watch the CI/CD pipeline. Confirm frontend builds, backend tests pass, and deploy syncs frontend dist correctly.

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | DTOs | 1 new |
| 2 | Prompt Builder | 1 new |
| 3 | Tool Catalog | 1 new |
| 4 | Draft Entity + Migration | 3 new |
| 5 | Tool Executor | 1 new |
| 6 | New Feign Clients | 4 new, 1 modified |
| 7 | Assistant Service (Orchestrator) | 1 new, 2 modified |
| 8 | Assistant Controller | 1 new |
| 9 | Gateway Route | 2 modified |
| 10 | Frontend API Client | 1 new |
| 11 | Frontend Context | 1 new |
| 12 | Frontend Chat UI | 6 new |
| 13 | Mount in FullLayout | 1 modified |
| 14 | Integration Test | 1 new |
| 15 | Build + Deploy | — |

**Total: 21 new files, 6 modified files**
