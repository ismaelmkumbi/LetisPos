# AI Assistant Intelligence Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LetisPOS Assistant dramatically smarter by adding multi-turn conversation memory, wiring in intent classification, building a knowledge base with semantic search, adding Anthropic tool-calling, and personalizing per user role.

**Architecture:** Phase 1 adds conversation memory (Redis) + wires the existing IntentClassifierService + adds Anthropic tool-calling + refactors providers for multi-turn messages arrays. Phase 2 adds a markdown-based knowledge base with in-memory embeddings for "how do I..." questions. Phase 3 adds role-based prompt customization and proactive alerts.

**Tech Stack:** Java 21, Spring Boot 3.x, Spring Data Redis (Lettuce), JUnit 5 + Mockito, OpenAI/Anthropic/DeepSeek APIs, React + TypeScript, MUI

---

## File Mapping

| File | Action | Responsibility |
|------|--------|----------------|
| `ai-service/src/main/java/io/smartpos/ai/application/ConversationStore.java` | **Create** | Redis CRUD for conversation messages + summaries |
| `ai-service/src/main/java/io/smartpos/ai/application/ConversationSummarizer.java` | **Create** | DeepSeek-based older-history compression |
| `ai-service/src/main/java/io/smartpos/ai/application/RoleProfile.java` | **Create** | Enum defining tone, verbosity, limits per role |
| `ai-service/src/main/java/io/smartpos/ai/application/KnowledgeBase.java` | **Create** | Embedding + cosine similarity search over markdown articles |
| `ai-service/src/main/java/io/smartpos/ai/infrastructure/redis/RedisConfig.java` | **Create** | Redis connection + StringRedisTemplate bean |
| `ai-service/src/main/resources/knowledge/sales/*.md` | **Create** | Starter knowledge articles (refund, discounts, receipts) |
| `ai-service/src/main/resources/knowledge/inventory/*.md` | **Create** | Starter knowledge articles (stock count, expiry, transfer) |
| `ai-service/src/main/resources/knowledge/products/*.md` | **Create** | Starter knowledge articles (barcodes, pricing, categories) |
| `ai-service/pom.xml` | **Modify** | Add spring-boot-starter-data-redis, lettuce-core |
| `ai-service/src/main/resources/application.yml` | **Modify** | Redis connection config, embedding API key |
| `ai-service/.../provider/AiProvider.java` | **Modify** | Add multi-turn `completeWithTools` / `complete` signatures |
| `ai-service/.../provider/OpenAiProvider.java` | **Modify** | Implement multi-turn `completeWithTools` |
| `ai-service/.../provider/DeepSeekProvider.java` | **Modify** | Implement multi-turn `completeWithTools` |
| `ai-service/.../provider/AnthropicProvider.java` | **Modify** | Add `completeWithTools` via Anthropic native tool-use API |
| `ai-service/.../IntentClassifierService.java` | **Modify** | Add confidence scoring to `classify()` |
| `ai-service/.../AssistantToolCatalog.java` | **Modify** | Add `scopedTools()` overload accepting `IntentClassification` |
| `ai-service/.../AssistantPromptBuilder.java` | **Modify** | Accept conversation summary, domain hint, resolved time, role profile |
| `ai-service/.../AssistantService.java` | **Modify** | Wire all new components, multi-turn messages, proactive alerts |
| `ai-service/.../AssistantController.java` | **Modify** | conversationId as `@RequestParam`, meta SSE event |
| `ai-service/.../api/dto/AssistantDtos.java` | **Modify** | Remove conversationId from ChatRequest, add MetaEvent |
| `frontend/src/api/smartpos/assistant.ts` | **Modify** | Accept `conversationId` param, parse `meta` event |
| `frontend/src/context/smartpos/AssistantContext.tsx` | **Modify** | Track `conversationId`, send on subsequent requests |

---

### Task 1: Redis infrastructure

**Files:**
- Modify: `backend/ai-service/pom.xml`
- Modify: `backend/ai-service/src/main/resources/application.yml`
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/redis/RedisConfig.java`

- [ ] **Step 1: Add Redis dependency to pom.xml**

Add inside the `<dependencies>` block:

```xml
<!-- Redis for conversation store -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

- [ ] **Step 2: Add Redis config to application.yml**

Add under the `spring:` block (alongside `datasource:`, `jpa:`, etc.):

```yaml
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      timeout: 5s
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 2
```

- [ ] **Step 3: Create RedisConfig.java**

```java
package io.smartpos.ai.infrastructure.redis;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        return template;
    }
}
```

- [ ] **Step 4: Verify Redis config compiles**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/ai-service/pom.xml backend/ai-service/src/main/resources/application.yml \
        backend/ai-service/src/main/java/io/smartpos/ai/infrastructure/redis/RedisConfig.java
git commit -m "feat: add Redis infrastructure for conversation store"
```

---

### Task 2: ConversationStore service

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/ConversationStore.java`

- [ ] **Step 1: Create ConversationStore.java**

```java
package io.smartpos.ai.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Component
public class ConversationStore {

    private static final String KEY_PREFIX = "assistant:conv:";
    private static final Duration TTL = Duration.ofMinutes(30);
    private static final int MAX_RECENT = 20; // ~10 exchanges (user + assistant pairs)

    private final StringRedisTemplate redis;
    private final ObjectMapper om;

    public ConversationStore(StringRedisTemplate redis, ObjectMapper om) {
        this.redis = redis;
        this.om = om;
    }

    record Conversation(String summary, List<Message> messages) {}

    record Message(String role, String content, List<Map<String, Object>> toolCalls,
                   String toolCallId, String timestamp) {}

    private String key(UUID tenantId, UUID conversationId) {
        return KEY_PREFIX + tenantId + ":" + conversationId;
    }

    public List<Map<String, Object>> loadMessages(UUID tenantId, UUID conversationId) {
        String json = redis.opsForValue().get(key(tenantId, conversationId));
        if (json == null || json.isBlank()) return List.of();
        try {
            Conversation conv = om.readValue(json, Conversation.class);
            List<Map<String, Object>> messages = new ArrayList<>();
            if (conv.summary != null && !conv.summary.isBlank()) {
                messages.add(Map.of("role", "system",
                    "content", "Previous conversation summary: " + conv.summary));
            }
            for (Message m : conv.messages) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("role", m.role);
                entry.put("content", m.content != null ? m.content : "");
                if (m.toolCalls != null) entry.put("tool_calls", m.toolCalls);
                if (m.toolCallId != null) entry.put("tool_call_id", m.toolCallId);
                messages.add(entry);
            }
            return messages;
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    public void save(UUID tenantId, UUID conversationId,
                     List<Message> messages, String summary) {
        Conversation conv = new Conversation(summary, messages);
        try {
            String json = om.writeValueAsString(conv);
            redis.opsForValue().set(key(tenantId, conversationId), json, TTL);
        } catch (JsonProcessingException ignored) {
        }
    }

    public void delete(UUID tenantId, UUID conversationId) {
        redis.delete(key(tenantId, conversationId));
    }
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/ConversationStore.java
git commit -m "feat: add ConversationStore for Redis-backed conversation memory"
```

---

### Task 3: ConversationSummarizer

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/ConversationSummarizer.java`

- [ ] **Step 1: Create ConversationSummarizer.java**

```java
package io.smartpos.ai.application;

import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ConversationSummarizer {

    private final AiRouter aiRouter;

    public ConversationSummarizer(AiRouter aiRouter) {
        this.aiRouter = aiRouter;
    }

    private static final String SUMMARIZE_PROMPT =
        "Summarize this conversation in under 200 words. Preserve: " +
        "domain (sales, inventory, finance, etc.), key entities (products, " +
        "customers, numbers mentioned), user intent, and any pending actions. " +
        "Write in English.";

    /**
     * Summarize older messages using DeepSeek (cheap, fast).
     * Falls back to a simple truncation if DeepSeek is unavailable.
     */
    public String summarize(List<ConversationStore.Message> messages) {
        if (messages.isEmpty()) return "";

        String transcript = messages.stream()
            .map(m -> m.role() + ": " + truncateContent(m.content()))
            .collect(Collectors.joining("\n"));

        if (transcript.length() < 500) return ""; // too short to need summarizing

        try {
            AiProvider provider = aiRouter.byName("deepseek");
            if (provider == null) return truncateFallback(messages);
            AiProvider.Result result = provider.complete(SUMMARIZE_PROMPT, transcript);
            return result.text() != null ? result.text().trim() : truncateFallback(messages);
        } catch (Exception e) {
            return truncateFallback(messages);
        }
    }

    private String truncateContent(String content) {
        if (content == null) return "";
        return content.length() > 300 ? content.substring(0, 300) + "..." : content;
    }

    private String truncateFallback(List<ConversationStore.Message> messages) {
        return messages.stream()
            .limit(5)
            .map(m -> m.role() + ": " + truncateContent(m.content()))
            .collect(Collectors.joining("; "));
    }
}
```

- [ ] **Step 2: Verify compiles — will fail due to AiRouter.byName() not existing**

Run: `cd backend/ai-service && mvn compile -q`
Expected: FAIL — `byName(String)` not found on AiRouter

- [ ] **Step 3: Add byName() to AiRouter**

Read `backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AiRouter.java` then add:

```java
/** Look up a specific provider by name, or null if not found. */
public AiProvider byName(String name) {
    return byName.get(name);
}
```

- [ ] **Step 4: Verify compiles now**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/ConversationSummarizer.java \
        backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AiRouter.java
git commit -m "feat: add ConversationSummarizer with DeepSeek fallback"
```

---

### Task 4: IntentClassifierService — add confidence scoring

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/IntentClassifierService.java`
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/api/dto/IntentClassification.java`

- [ ] **Step 1: Read current IntentClassification record**

Read `backend/ai-service/src/main/java/io/smartpos/ai/api/dto/IntentClassification.java`

- [ ] **Step 2: Add confidence field to IntentClassification**

Add field:
```java
double confidence // 0.0 to 1.0
```

And update the factory method `of()` to default confidence to 0.5.

- [ ] **Step 3: Add confidence scoring to classify()**

In `IntentClassifierService.classify()`, compute a basic confidence score:

After line `Domain primary = classifyDomain(lower);`, add:

```java
double confidence = computeConfidence(lower, primary);
```

Add the method:

```java
private double computeConfidence(String lower, Domain primary) {
    if (primary == Domain.GENERAL) return 0.3; // uncertain
    var keywords = DOMAIN_KEYWORDS.get(primary);
    if (keywords == null || keywords.isEmpty()) return 0.3;
    long matchCount = keywords.stream()
        .filter(kw -> containsWord(lower, kw))
        .count();
    // More matches → higher confidence, capped at 0.95
    return Math.min(0.95, 0.4 + (matchCount * 0.15));
}
```

Update the `IntentClassification` constructor call at end of `classify()` to include `confidence`:

```java
return new IntentClassification(primary, secondaries, lang, time, isWrite, keywords, confidence);
```

- [ ] **Step 4: Use confidence in narrowTools()**

In `narrowTools()`, check confidence before narrowing:

```java
public Set<String> narrowTools(IntentClassification intent, Set<String> allToolNames) {
    if (intent == null || intent.primaryDomain() == Domain.GENERAL || intent.confidence() < 0.5) {
        return allToolNames;
    }
    // ... existing narrowing logic
}
```

- [ ] **Step 5: Run existing tests**

Run: `cd backend/ai-service && mvn test -pl . -Dtest="IntentClassifierServiceTest"`
Expected: Existing tests pass, may need to update constructor calls.

Update test constructor calls if needed to include the new `confidence` parameter.

- [ ] **Step 6: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/IntentClassifierService.java \
        backend/ai-service/src/main/java/io/smartpos/ai/api/dto/IntentClassification.java \
        backend/ai-service/src/test/java/io/smartpos/ai/application/IntentClassifierServiceTest.java
git commit -m "feat: add confidence scoring to intent classifier"
```

---

### Task 5: AiProvider — add multi-turn signatures

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AiProvider.java`

- [ ] **Step 1: Add multi-turn method signatures to AiProvider.java**

Add to the interface after the existing `completeWithTools` default method:

```java
/** Multi-turn variant: accepts full conversation messages array. */
default ToolCallResult completeWithTools(
        String systemPrompt,
        List<Map<String, Object>> messages,
        List<Map<String, Object>> tools) {
    throw new UnsupportedOperationException(
            "Provider " + name() + " does not support multi-turn tool calling");
}

/** Multi-turn variant: accepts full conversation messages array. */
default Result complete(
        String systemPrompt,
        List<Map<String, Object>> messages) {
    throw new UnsupportedOperationException(
            "Provider " + name() + " does not support multi-turn");
}
```

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS (only changing an interface with default methods)

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AiProvider.java
git commit -m "feat: add multi-turn message signatures to AiProvider interface"
```

---

### Task 6: OpenAiProvider — implement multi-turn

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/provider/OpenAiProvider.java`

- [ ] **Step 1: Refactor completeWithTools to extract reusable call method**

Read the current file first. Extract a private `callWithMessages()` method that the new multi-turn signature can reuse:

```java
@Override
public ToolCallResult completeWithTools(String systemPrompt, String userPrompt,
                                         List<Map<String, Object>> tools) {
    // Build single-turn messages list from pair
    List<Map<String, Object>> messages = new ArrayList<>();
    messages.add(Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : ""));
    messages.add(Map.of("role", "user", "content", userPrompt));
    return completeWithTools(systemPrompt, messages, tools);
}

@Override
public ToolCallResult completeWithTools(String systemPrompt,
                                         List<Map<String, Object>> messages,
                                         List<Map<String, Object>> tools) {
    if (props.openai().apiKey() == null || props.openai().apiKey().isBlank()) {
        throw new IllegalStateException("OPENAI_API_KEY not configured");
    }
    Map<String, Object> body = new HashMap<>();
    body.put("model", props.openai().model());
    // Prepend system message to messages array
    List<Map<String, Object>> fullMessages = new ArrayList<>();
    fullMessages.add(Map.of("role", "system", "content",
        systemPrompt != null ? systemPrompt : ""));
    fullMessages.addAll(messages);
    body.put("messages", fullMessages);
    body.put("tools", tools);
    body.put("tool_choice", "auto");
    return executeToolCall(body);
}
```

Then extract the HTTP call + response parsing into `executeToolCall()`:

```java
@SuppressWarnings("unchecked")
private ToolCallResult executeToolCall(Map<String, Object> body) {
    Map<String, Object> resp = http.post()
            .uri(url())
            .header("Authorization", "Bearer " + props.openai().apiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(60))
            .block();

    if (resp == null) throw new IllegalStateException("Empty response from OpenAI");

    List<Map<String, Object>> choices =
        (List<Map<String, Object>>) resp.get("choices");
    String text = "";
    List<ToolCall> toolCalls = List.of();

    if (choices != null && !choices.isEmpty()) {
        Map<String, Object> message =
            (Map<String, Object>) choices.get(0).get("message");
        if (message != null) {
            Object content = message.get("content");
            if (content != null) text = String.valueOf(content);

            List<Map<String, Object>> rawCalls =
                (List<Map<String, Object>>) message.get("tool_calls");
            if (rawCalls != null) {
                toolCalls = new ArrayList<>();
                for (var rc : rawCalls) {
                    Map<String, Object> fn =
                        (Map<String, Object>) rc.get("function");
                    toolCalls.add(new ToolCall(
                        String.valueOf(rc.get("id")),
                        fn != null ? String.valueOf(fn.get("name")) : "",
                        fn != null ? String.valueOf(fn.get("arguments")) : "{}"));
                }
            }
        }
    }

    Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
    Integer pTok = usage == null ? null : asInt(usage.get("prompt_tokens"));
    Integer cTok = usage == null ? null : asInt(usage.get("completion_tokens"));
    return new ToolCallResult(text, toolCalls, pTok, cTok);
}
```

Remove the old `completeWithTools` body and replace with the refactored version above.

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/provider/OpenAiProvider.java
git commit -m "feat: add multi-turn tool calling to OpenAI provider"
```

---

### Task 7: DeepSeekProvider — implement multi-turn

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/provider/DeepSeekProvider.java`

- [ ] **Step 1: Add completeWithTools to DeepSeekProvider**

DeepSeek uses an OpenAI-compatible API, so the implementation mirrors the single-turn OpenAiProvider pattern:

```java
@Override
public ToolCallResult completeWithTools(String systemPrompt, String userPrompt,
                                         List<Map<String, Object>> tools) {
    List<Map<String, Object>> messages = new ArrayList<>();
    messages.add(Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : ""));
    messages.add(Map.of("role", "user", "content", userPrompt));
    return completeWithTools(systemPrompt, messages, tools);
}

@Override
@SuppressWarnings("unchecked")
public ToolCallResult completeWithTools(String systemPrompt,
                                         List<Map<String, Object>> messages,
                                         List<Map<String, Object>> tools) {
    if (props.deepseek().apiKey() == null || props.deepseek().apiKey().isBlank()) {
        throw new IllegalStateException("DEEPSEEK_API_KEY not configured");
    }
    Map<String, Object> body = new HashMap<>();
    body.put("model", props.deepseek().model());
    List<Map<String, Object>> fullMessages = new ArrayList<>();
    fullMessages.add(Map.of("role", "system", "content",
        systemPrompt != null ? systemPrompt : ""));
    fullMessages.addAll(messages);
    body.put("messages", fullMessages);
    body.put("tools", tools);
    body.put("tool_choice", "auto");

    Map<String, Object> resp = http.post()
            .uri(props.deepseek().baseUrl() + "/chat/completions")
            .header("Authorization", "Bearer " + props.deepseek().apiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(60))
            .block();

    if (resp == null) throw new IllegalStateException("Empty response from DeepSeek");

    List<Map<String, Object>> choices =
        (List<Map<String, Object>>) resp.get("choices");
    String text = "";
    List<ToolCall> toolCalls = List.of();

    if (choices != null && !choices.isEmpty()) {
        Map<String, Object> message =
            (Map<String, Object>) choices.get(0).get("message");
        if (message != null) {
            Object content = message.get("content");
            if (content != null) text = String.valueOf(content);

            List<Map<String, Object>> rawCalls =
                (List<Map<String, Object>>) message.get("tool_calls");
            if (rawCalls != null) {
                toolCalls = new ArrayList<>();
                for (var rc : rawCalls) {
                    Map<String, Object> fn =
                        (Map<String, Object>) rc.get("function");
                    toolCalls.add(new ToolCall(
                        String.valueOf(rc.get("id")),
                        fn != null ? String.valueOf(fn.get("name")) : "",
                        fn != null ? String.valueOf(fn.get("arguments")) : "{}"));
                }
            }
        }
    }

    Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
    Integer pTok = usage == null ? null : asInt(usage.get("prompt_tokens"));
    Integer cTok = usage == null ? null : asInt(usage.get("completion_tokens"));
    return new ToolCallResult(text, toolCalls, pTok, cTok);
}
```

Add imports: `java.util.HashMap` and `java.util.ArrayList`.

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/provider/DeepSeekProvider.java
git commit -m "feat: add tool calling support to DeepSeek provider"
```

---

### Task 8: AnthropicProvider — add tool-calling + multi-turn

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AnthropicProvider.java`

- [ ] **Step 1: Add completeWithTools to AnthropicProvider**

Anthropic's Messages API uses a different tool format — tools are a top-level `tools` array with `name`, `description`, `input_schema`. The response places tool use blocks directly in content.

```java
@Override
@SuppressWarnings("unchecked")
public ToolCallResult completeWithTools(String systemPrompt, String userPrompt,
                                         List<Map<String, Object>> tools) {
    List<Map<String, Object>> messages = new ArrayList<>();
    messages.add(Map.of("role", "user", "content", userPrompt));
    return completeWithTools(systemPrompt, messages, tools);
}

@Override
@SuppressWarnings("unchecked")
public ToolCallResult completeWithTools(String systemPrompt,
                                         List<Map<String, Object>> messages,
                                         List<Map<String, Object>> tools) {
    if (props.anthropic().apiKey() == null || props.anthropic().apiKey().isBlank()) {
        throw new IllegalStateException("ANTHROPIC_API_KEY not configured");
    }

    // Convert OpenAI-format tools to Anthropic-format tools
    List<Map<String, Object>> anthropicTools = new ArrayList<>();
    for (Map<String, Object> tool : tools) {
        Map<String, Object> fn = (Map<String, Object>) tool.get("function");
        if (fn != null) {
            Map<String, Object> at = new LinkedHashMap<>();
            at.put("name", fn.get("name"));
            at.put("description", fn.get("description"));
            at.put("input_schema", fn.get("parameters"));
            anthropicTools.add(at);
        }
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("model", props.anthropic().model());
    body.put("max_tokens", props.anthropic().maxTokens());
    body.put("system", systemPrompt != null ? systemPrompt : "");
    body.put("messages", messages);
    body.put("tools", anthropicTools);

    Map<String, Object> resp = http.post()
            .uri(URL)
            .header("x-api-key", props.anthropic().apiKey())
            .header("anthropic-version", "2023-06-01")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(60))
            .block();

    if (resp == null) throw new IllegalStateException("Empty response from Anthropic");

    StringBuilder text = new StringBuilder();
    List<ToolCall> toolCalls = new ArrayList<>();

    List<Map<String, Object>> content = (List<Map<String, Object>>) resp.get("content");
    if (content != null) {
        for (Map<String, Object> block : content) {
            String type = (String) block.get("type");
            if ("text".equals(type)) {
                text.append(block.get("text"));
            } else if ("tool_use".equals(type)) {
                String id = (String) block.get("id");
                String name = (String) block.get("name");
                Map<String, Object> input = (Map<String, Object>) block.get("input");
                String args = "{}";
                try {
                    args = om.writeValueAsString(input != null ? input : Map.of());
                } catch (JsonProcessingException ignored) {}
                toolCalls.add(new ToolCall(id, name, args));
            }
        }
    }

    Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
    Integer pTok = usage == null ? null : asInt(usage.get("input_tokens"));
    Integer cTok = usage == null ? null : asInt(usage.get("output_tokens"));
    return new ToolCallResult(text.toString(), toolCalls, pTok, cTok);
}
```

Add new imports:
```java
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
```

Add a field for the ObjectMapper:
```java
private final ObjectMapper om = new ObjectMapper();
```

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/provider/AnthropicProvider.java
git commit -m "feat: add tool calling support to Anthropic provider"
```

---

### Task 9: AssistantToolCatalog — intent-based narrowing

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantToolCatalog.java`

- [ ] **Step 1: Add intent-aware scopedTools variant**

Add overloaded method and wire IntentClassifierService:

```java
private final IntentClassifierService classifier;

// Add to existing constructor:
public AssistantToolCatalog(IntentClassifierService classifier) {
    this.classifier = classifier;
}

/**
 * Narrow tools using intent classification. When confidence is >= 0.5,
 * only tools matching the primary domain are sent. Falls back to all
 * scoped tools when uncertain.
 */
public List<ToolDef> scopedTools(Jwt jwt, String message) {
    List<ToolDef> allScoped = scopedTools(jwt);
    var intent = classifier.classify(message);
    Set<String> allNames = allScoped.stream()
        .map(ToolDef::name).collect(Collectors.toSet());
    Set<String> narrowed = classifier.narrowTools(intent, allNames);
    if (narrowed.size() == allNames.size()) return allScoped;
    return allScoped.stream()
        .filter(t -> narrowed.contains(t.name()))
        .toList();
}
```

Add import: `import java.util.stream.Collectors;`

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantToolCatalog.java
git commit -m "feat: add intent-based tool narrowing to tool catalog"
```

---

### Task 10: RoleProfile enum

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/RoleProfile.java`

- [ ] **Step 1: Create RoleProfile.java**

```java
package io.smartpos.ai.application;

import java.util.List;

public enum RoleProfile {

    CASHIER(
        "You are talking to a cashier at the front counter. Be FAST.",
        "concise — max 2-3 sentences or one action step",
        List.of("How much is X?", "Process a return", "Check stock of Y"),
        2
    ),
    MANAGER(
        "You are talking to a store manager. Balance data with action.",
        "moderate — provide context and recommendations",
        List.of("How are sales today vs yesterday?", "Who's on leave this week?"),
        4
    ),
    OWNER(
        "You are talking to the store owner. Be insightful. " +
        "Lead with the headline metric, then context, then recommended action. " +
        "Include comparisons when showing numbers. " +
        "Proactively flag risks and opportunities. Think about margins, not just revenue.",
        "detailed — show numbers, trends, and what to do about them",
        List.of("What's driving revenue this month?", "Which products have best margins?"),
        5
    ),
    SUPER_ADMIN(
        "You have SUPER_ADMIN access. You can query across all tenants " +
        "and perform administrative actions without draft confirmation.",
        "detailed with platform-wide context",
        List.of("Show all tenants on trial", "Which tenant has highest sales?"),
        6
    );

    private final String toneInstruction;
    private final String verbosity;
    private final List<String> examplePrompts;
    private final int maxToolRounds;

    RoleProfile(String toneInstruction, String verbosity,
                List<String> examplePrompts, int maxToolRounds) {
        this.toneInstruction = toneInstruction;
        this.verbosity = verbosity;
        this.examplePrompts = examplePrompts;
        this.maxToolRounds = maxToolRounds;
    }

    public String toneInstruction() { return toneInstruction; }
    public String verbosity() { return verbosity; }
    public List<String> examplePrompts() { return examplePrompts; }
    public int maxToolRounds() { return maxToolRounds; }

    @SuppressWarnings("unchecked")
    public static RoleProfile fromJwt(List<String> roles) {
        if (roles == null || roles.isEmpty()) return CASHIER;
        if (roles.contains("SUPER_ADMIN")) return SUPER_ADMIN;
        if (roles.contains("OWNER")) return OWNER;
        if (roles.contains("MANAGER")) return MANAGER;
        return CASHIER;
    }
}
```

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/RoleProfile.java
git commit -m "feat: add role-based profiles for assistant personalization"
```

---

### Task 11: AssistantPromptBuilder — enhanced

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantPromptBuilder.java`

- [ ] **Step 1: Add enhanced build() method**

Add an overloaded `build()` that accepts the new context:

```java
public String build(Jwt jwt, String language, IntentClassification intent,
                    String conversationSummary, RoleProfile roleProfile) {
    @SuppressWarnings("unchecked")
    var roles = (List<String>) jwt.getClaims().get("roles");
    String roleStr = roles != null && !roles.isEmpty()
        ? String.join(", ", roles) : "USER";

    String tenantName = jwt.getClaimAsString("tenantName");
    String billingPlan = jwt.getClaimAsString("billingPlan");
    String lang = resolveLanguage(language, intent);
    RoleProfile profile = roleProfile != null ? roleProfile : RoleProfile.fromJwt(roles);

    StringBuilder sb = new StringBuilder();

    sb.append(String.format(BASE_PROMPT,
        tenantName != null ? tenantName : "Unknown",
        billingPlan != null ? billingPlan : "STARTER",
        roleStr,
        LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
        lang
    ));

    // Role-specific tone
    sb.append("\n").append(profile.toneInstruction());
    sb.append("\nVerbosity: ").append(profile.verbosity());

    // Domain hint from intent
    if (intent != null && intent.primaryDomain() != IntentClassification.Domain.GENERAL
        && intent.confidence() >= 0.5) {
        sb.append("\nThe user is asking about ").append(intent.primaryDomain().name().toLowerCase())
          .append(" management.");
    }

    // Resolved time
    if (intent != null && intent.resolvedTime() != null) {
        var time = intent.resolvedTime();
        if (time.from() != null && time.to() != null) {
            sb.append("\nUser time reference resolves to: ").append(time.from())
              .append(" to ").append(time.to()).append(".");
        }
    }

    // Conversation summary
    if (conversationSummary != null && !conversationSummary.isBlank()) {
        sb.append("\nPrevious conversation: ").append(conversationSummary);
    }

    // Write intent priming
    if (intent != null && intent.isWrite()) {
        sb.append("\nThis is a write action. Explain what will happen before using the tool.");
    }

    // Super admin extra
    if (roles != null && roles.contains("SUPER_ADMIN")) {
        sb.append("\n").append(SUPER_ADMIN_EXTRA);
    }

    return sb.toString();
}

private String resolveLanguage(String clientLang, IntentClassification intent) {
    if (intent != null && intent.language() == IntentClassification.Language.SWAHILI) {
        return "Swahili";
    }
    if (intent != null && intent.language() == IntentClassification.Language.MIXED) {
        return "Swahili or English, match the user's language";
    }
    return clientLang != null && clientLang.equals("sw") ? "Swahili" : "English";
}
```

Add import:
```java
import io.smartpos.ai.api.dto.IntentClassification;
```

Keep the existing `build(Jwt, String)` method for backward compatibility with other callers.

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantPromptBuilder.java
git commit -m "feat: enhance prompt builder with intent, role, and conversation context"
```

---

### Task 12: AssistantDtos — API contract changes

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/api/dto/AssistantDtos.java`

- [ ] **Step 1: Update DTOs**

Remove `conversationId` from `ChatRequest`, add `MetaEvent` to `StreamEvent`:

```java
public record ChatRequest(
    String message,
    String language
) {}

public sealed interface StreamEvent {
    record MetaEvent(UUID conversationId) implements StreamEvent {}
    record TokenEvent(String token) implements StreamEvent {}
    record ToolStartEvent(String toolName) implements StreamEvent {}
    record ToolResultEvent(ToolResult result) implements StreamEvent {}
    record DraftEvent(DraftResponse draft) implements StreamEvent {}
    record ErrorEvent(String message, String code) implements StreamEvent {}
    record DoneEvent() implements StreamEvent {}
}
```

- [ ] **Step 2: Compile — will fail where ChatRequest is constructed**

Run: `cd backend/ai-service && mvn compile -q`
Expected: FAIL — callers passing `conversationId` to `ChatRequest` constructor

- [ ] **Step 3: Fix callers**

Search for `new ChatRequest(` or `ChatRequest(` in the codebase. Update any constructions to not pass `conversationId`.

Run: `grep -r "ChatRequest" backend/ai-service/src --include="*.java" -l`

Fix each file. In `AssistantController.java`, the `@Valid @RequestBody AssistantDtos.ChatRequest` will compile fine since Jackson handles records by field name. Only explicit `new ChatRequest(...)` calls need updating.

- [ ] **Step 4: Compile — should pass now**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/dto/AssistantDtos.java
# Add any other files that needed ChatRequest constructor fixes
git commit -m "feat: update assistant DTOs — remove conversationId from body, add MetaEvent"
```

---

### Task 13: AssistantController — API changes

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/api/AssistantController.java`

- [ ] **Step 1: Update controller**

Accept `conversationId` as a query parameter, emit `meta` event on first message:

```java
@PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
@PreAuthorize("isAuthenticated()")
public SseEmitter chat(@Valid @RequestBody AssistantDtos.ChatRequest request,
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) UUID conversationId) {
    UUID userId = principal(jwt);
    return assistantService.chat(request, jwt, userId, conversationId);
}
```

- [ ] **Step 2: Compile — will fail if AssistantService.chat() signature hasn't changed yet**

Run: `cd backend/ai-service && mvn compile -q`
Expected: FAIL — `AssistantService.chat(request, jwt, userId, conversationId)` doesn't exist yet

This is expected. We'll update AssistantService in the next task.

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/AssistantController.java
git commit -m "feat: accept conversationId as query param in assistant chat endpoint"
```

---

### Task 14: AssistantService — integrate everything

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java`

- [ ] **Step 1: Read current file**

Read `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java`

- [ ] **Step 2: Add new dependencies via constructor injection**

Add to the existing constructor:

```java
private final ConversationStore conversationStore;
private final ConversationSummarizer summarizer;
private final IntentClassifierService classifier;
```

Update constructor parameters accordingly.

- [ ] **Step 3: Update chat() method**

The new signature:

```java
public SseEmitter chat(AssistantDtos.ChatRequest request, Jwt jwt,
                       UUID userId, UUID conversationIdParam) {
```

Inside the method, the key changes:

```java
// 1. Classify intent
IntentClassification intent = classifier.classify(request.message());

// 2. Determine role profile
@SuppressWarnings("unchecked")
var roles = (List<String>) jwt.getClaims().get("roles");
RoleProfile profile = RoleProfile.fromJwt(roles);
int effectiveMaxRounds = profile.maxToolRounds();

// 3. Determine language (intent can override client preference)
String effectiveLanguage = intent.language() == IntentClassification.Language.SWAHILI
    ? "sw" : request.language();

// 4. Handle conversation: create new or load existing
UUID tenantId = TenantContext.require();
UUID convId = conversationIdParam != null ? conversationIdParam : UUID.randomUUID();
List<Map<String, Object>> history = conversationStore.loadMessages(tenantId, convId);
String summary = history.isEmpty() ? null :
    history.stream()
        .filter(m -> "system".equals(m.get("role")) && String.valueOf(m.get("content")).startsWith("Previous conversation summary"))
        .map(m -> String.valueOf(m.get("content")).replace("Previous conversation summary: ", ""))
        .findFirst().orElse(null);

// Remove the summary system message from history before sending to LLM
List<Map<String, Object>> cleanHistory = history.stream()
    .filter(m -> !("system".equals(m.get("role")) && String.valueOf(m.get("content")).startsWith("Previous conversation summary")))
    .collect(Collectors.toList());
cleanHistory.add(Map.of("role", "user", "content", request.message()));

// 5. Build enhanced prompt
String systemPrompt = promptBuilder.build(jwt, effectiveLanguage, intent, summary, profile);

// 6. Narrowed tools
List<AssistantToolCatalog.ToolDef> tools = toolCatalog.scopedTools(jwt, request.message());

// 7. SSE emitter with meta event on new conversation
SseEmitter emitter = new SseEmitter(120_000L);
if (conversationIdParam == null) {
    try {
        emitter.send(SseEmitter.event().name("meta")
            .data(Map.of("conversationId", convId.toString())));
    } catch (IOException ignored) {}
}

// ... rest of the existing thread + processConversation logic,
// but pass cleanHistory instead of single userMessage,
// and use effectiveMaxRounds instead of MAX_TOOL_ROUNDS
```

- [ ] **Step 4: Update processConversation() to accept messages array**

Change signature:

```java
private void processConversation(SseEmitter emitter, String systemPrompt,
                                  List<Map<String, Object>> messages,
                                  List<AssistantToolCatalog.ToolDef> tools,
                                  UUID userId, UUID tenantId,
                                  UUID conversationId, int round,
                                  boolean isSuperAdmin) throws IOException {
```

Inside, change the provider call from:

```java
result = provider.completeWithTools(systemPrompt, userMessage,
    openAiTools.isEmpty() ? null : openAiTools);
```

To:

```java
result = provider.completeWithTools(systemPrompt, messages,
    openAiTools.isEmpty() ? null : openAiTools);
```

Replace `effectiveMaxRounds` / `profile.maxToolRounds()` in the max-rounds check.

Add conversation saving at the end of each round: save the messages list + newly added assistant response to `conversationStore.save()`.

- [ ] **Step 5: Add summarization trigger**

After saving, check if the conversation exceeds 20 messages (10 exchanges). If so, summarize the older half:

```java
List<ConversationStore.Message> stored = conversationStore.loadMessages(...);
if (stored.size() > 20) {
    List<ConversationStore.Message> olderHalf = stored.subList(0, stored.size() - 20);
    String newSummary = summarizer.summarize(olderHalf);
    List<ConversationStore.Message> recentHalf = stored.subList(stored.size() - 20, stored.size());
    conversationStore.save(tenantId, conversationId, recentHalf, newSummary);
}
```

- [ ] **Step 6: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS after fixing any compilation issues

- [ ] **Step 7: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java
git commit -m "feat: integrate conversation memory, intent, and role profiles into assistant"
```

---

### Task 15: Frontend — API layer changes

**Files:**
- Modify: `frontend/src/api/smartpos/assistant.ts`

- [ ] **Step 1: Update streamChat to accept and emit conversationId**

```typescript
export type StreamEvent =
  | { type: 'meta'; conversationId: string }
  | { type: 'token'; token: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'draft'; draft: DraftResponse }
  | { type: 'error'; message: string; code: string }
  | { type: 'done' };

export async function* streamChat(
  request: ChatRequest,
  conversationId: string | null,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem(TOKEN_KEY) || '';

  const params = new URLSearchParams();
  if (conversationId) params.set('conversationId', conversationId);
  const queryString = params.toString();

  const response = await fetch(`/api/v1/ai/assistant/chat${queryString ? '?' + queryString : ''}`, {
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

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '{}') {
          if (currentEvent === 'done') yield { type: 'done' };
          continue;
        }
        try {
          const payload = JSON.parse(dataStr);
          switch (currentEvent) {
            case 'meta':
              yield { type: 'meta', conversationId: payload.conversationId || '' };
              break;
            case 'token':
              yield { type: 'token', token: payload.token || '' };
              break;
            case 'tool_start':
              yield { type: 'tool_start', toolName: payload.toolName || '' };
              break;
            case 'tool_result':
              yield { type: 'tool_result', result: payload as ToolResult };
              break;
            case 'draft':
              yield { type: 'draft', draft: payload as DraftResponse };
              break;
            case 'error':
              yield { type: 'error', message: payload.message || 'Unknown error', code: payload.code || 'UNKNOWN' };
              break;
          }
        } catch {
          // skip unparseable
        }
      }
    }
  }
}
```

Also update `ChatRequest` to remove `conversationId`:

```typescript
export interface ChatRequest {
  message: string;
  language?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/assistant.ts
git commit -m "feat: add conversationId support to assistant API layer"
```

---

### Task 16: Frontend — AssistantContext conversation tracking

**Files:**
- Modify: `frontend/src/context/smartpos/AssistantContext.tsx`

- [ ] **Step 1: Track conversationId in context state**

Add to state:

```typescript
interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  conversationId: string | null;  // NEW
}
```

Initialize `conversationId` to `null` in `useState`.

- [ ] **Step 2: Update send() to handle meta event and send conversationId**

In the `send` callback, update the `streamChat` call:

```typescript
for await (const event of streamChat({ message }, conversationId, controller.signal)) {
```

Add case for `meta` event:

```typescript
case 'meta':
  setConversationId(event.conversationId);
  break;
```

Where `setConversationId` is a new setter. Also update the `clearMessages` function to reset `conversationId` to `null`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors related to AssistantContext

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/smartpos/AssistantContext.tsx
git commit -m "feat: track and send conversationId in assistant context"
```

---

### Task 17: KnowledgeBase service

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/KnowledgeBase.java`

- [ ] **Step 1: Create KnowledgeBase.java**

```java
package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class KnowledgeBase {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeBase.class);

    private final WebClient http = WebClient.builder().build();
    private final ObjectMapper om = new ObjectMapper();

    @Value("${OPENAI_API_KEY:}")
    private String openAiKey;

    private final List<Chunk> chunks = new ArrayList<>();

    record Chunk(String title, String category, String text, double[] embedding) {}

    @PostConstruct
    void init() {
        if (openAiKey == null || openAiKey.isBlank()) {
            log.warn("OPENAI_API_KEY not set — knowledge base embeddings disabled");
            return;
        }
        try {
            loadArticles();
            log.info("Knowledge base loaded: {} chunks", chunks.size());
        } catch (Exception e) {
            log.error("Failed to load knowledge base", e);
        }
    }

    private void loadArticles() throws Exception {
        var resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:knowledge/**/*.md");
        for (Resource res : resources) {
            String content = res.getContentAsString(StandardCharsets.UTF_8);
            parseAndChunk(res.getFilename(), content);
        }
    }

    private void parseAndChunk(String filename, String content) {
        // Parse YAML frontmatter (between --- markers)
        String title = filename;
        String category = "general";
        String body = content;

        if (content.startsWith("---")) {
            int end = content.indexOf("---", 3);
            if (end > 0) {
                String frontmatter = content.substring(3, end).trim();
                for (String line : frontmatter.split("\n")) {
                    String[] parts = line.split(":", 2);
                    if (parts.length == 2) {
                        String key = parts[0].trim();
                        String value = parts[1].trim();
                        if ("title".equals(key)) title = value;
                        if ("category".equals(key)) category = value;
                    }
                }
                body = content.substring(end + 3).trim();
            }
        }

        // Chunk by headings (split on ##)
        String[] sections = body.split("\n## ");
        for (int i = 0; i < sections.length; i++) {
            String section = (i > 0 ? "## " : "") + sections[i];
            if (section.trim().length() < 50) continue;
            double[] embedding = embed(section.trim());
            if (embedding != null) {
                chunks.add(new Chunk(title, category, section.trim(), embedding));
            }
        }
    }

    private double[] embed(String text) {
        if (openAiKey == null || openAiKey.isBlank()) return null;
        try {
            Map<String, Object> body = Map.of(
                "model", "text-embedding-3-small",
                "input", text
            );
            String resp = http.post()
                .uri("https://api.openai.com/v1/embeddings")
                .header("Authorization", "Bearer " + openAiKey)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            if (resp == null) return null;
            JsonNode node = om.readTree(resp);
            JsonNode data = node.get("data");
            if (data != null && data.isArray() && data.size() > 0) {
                JsonNode emb = data.get(0).get("embedding");
                if (emb != null) {
                    double[] vec = new double[emb.size()];
                    for (int i = 0; i < emb.size(); i++) vec[i] = emb.get(i).asDouble();
                    return vec;
                }
            }
        } catch (Exception e) {
            log.debug("Embedding failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Search knowledge base by semantic similarity.
     * Returns top 3 matching chunks, or empty list if embeddings unavailable.
     */
    public List<String> search(String query, String domain) {
        if (chunks.isEmpty()) return List.of();

        double[] queryVec = embed(query);
        if (queryVec == null) return List.of();

        return chunks.stream()
            .map(c -> new Object() {
                final Chunk chunk = c;
                final double score = cosine(queryVec, c.embedding);
            })
            .filter(x -> x.score > 0.3)
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(3)
            .map(x -> x.chunk.text)
            .toList();
    }

    private double cosine(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
```

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/KnowledgeBase.java
git commit -m "feat: add knowledge base with semantic search using OpenAI embeddings"
```

---

### Task 18: Initial knowledge articles

**Files:**
- Create: `backend/ai-service/src/main/resources/knowledge/sales/processing-a-refund.md`
- Create: `backend/ai-service/src/main/resources/knowledge/sales/applying-discounts.md`
- Create: `backend/ai-service/src/main/resources/knowledge/inventory/stock-counting.md`
- Create: `backend/ai-service/src/main/resources/knowledge/inventory/handling-expiring-stock.md`
- Create: `backend/ai-service/src/main/resources/knowledge/products/managing-barcodes.md`

- [ ] **Step 1: Create knowledge directory structure**

Run:
```bash
mkdir -p backend/ai-service/src/main/resources/knowledge/sales
mkdir -p backend/ai-service/src/main/resources/knowledge/inventory
mkdir -p backend/ai-service/src/main/resources/knowledge/products
mkdir -p backend/ai-service/src/main/resources/knowledge/finance
mkdir -p backend/ai-service/src/main/resources/knowledge/customers
```

- [ ] **Step 2: Create sales/processing-a-refund.md**

```markdown
---
title: Processing a Refund
category: sales
tags: [refund, returns, credit, receipt]
---

# Processing a Refund

1. Open the Sales module from the sidebar menu
2. Click "Sales History" and locate the original receipt
3. Click the "..." menu next to the sale, then choose "Refund"
4. Select which items to refund and the quantity for each
5. Choose the refund method:
   - Cash: return physical money to the customer
   - Mobile money: refund to the same phone number
   - Store credit: adds to the customer's loyalty account balance
6. Review the credit note preview, then click Confirm

## Important Notes
- You need the `sales.refund` permission to process refunds
- The original receipt must be within 90 days
- Partial refunds are supported — you can refund some items and not others
- Store credit refunds require the customer to have a loyalty account
- Refunded stock returns to inventory automatically
```

- [ ] **Step 3: Create sales/applying-discounts.md**

```markdown
---
title: Applying Discounts
category: sales
tags: [discount, promotion, pricing, sale]
---

# Applying Discounts

## On Individual Items
1. While adding items to a sale, click the price shown next to the item
2. Enter a discounted price, or a percentage discount
3. The system shows both original and discounted price on the receipt

## On the Whole Sale
1. After adding all items, click "Apply Discount" at the bottom
2. Enter either a percentage (e.g., 10%) or a fixed amount (e.g., TZS 5,000)
3. The discount appears as a separate line on the receipt

## Setting Up Automatic Promotions
1. Go to Products > Promotions
2. Click "New Promotion"
3. Choose the type: percentage discount, buy X get Y free, or fixed price
4. Select which products or categories the promotion applies to
5. Set the start and end dates
6. Promotions apply automatically during checkout within the date range

## Notes
- Manual discounts require the `sales.discount` permission
- Creating promotions requires the `products.promotion` permission
- Discounts are calculated before tax
```

- [ ] **Step 4: Create inventory/stock-counting.md**

```markdown
---
title: Stock Counting and Reconciliation
category: inventory
tags: [stock take, counting, reconciliation, adjustment]
---

# Stock Counting and Reconciliation

## Starting a Stock Count
1. Go to Inventory > Stock Count
2. Click "New Count"
3. Select the warehouse and optionally filter by product category
4. Click "Start Count" — this freezes inventory records for counting
5. Enter the physical count for each product shown
6. Submit the count for review

## Reconciling Differences
1. After submitting, the system shows variances (differences between system and count)
2. Review each variance line:
   - Positive variance = more stock than system thought (possible data entry error)
   - Negative variance = less stock than system thought (possible theft or damage)
3. Add notes explaining each variance
4. Click "Approve" to update inventory levels

## Notes
- Stock counts require the `inventory.count` permission
- Approval requires the `inventory.adjust` permission
- You can pause a count and resume later — progress is saved
- Conduct full stock takes at least monthly for accurate reporting
```

- [ ] **Step 5: Create inventory/handling-expiring-stock.md**

```markdown
---
title: Handling Expiring Stock
category: inventory
tags: [expiry, waste, discount, FEFO]
---

# Handling Expiring Stock

## Finding Expiring Products
1. Go to Inventory > Expiry Tracking
2. The dashboard shows products expiring within 30, 60, and 90 days
3. Click any product to see batch details and exact expiry dates
4. Sort by days remaining to prioritize

## Recommended Actions
- **14-30 days out:** Apply a discount (10-20%) to move stock faster
- **7-14 days out:** Aggressive discount (30-50%) or bundle with popular items
- **0-7 days out:** Remove from shelves, record as waste if expired

## Setting Up Expiry Alerts
1. Go to Inventory > Settings
2. Set alert thresholds (default: warn at 30 days, critical at 14 days)
3. Enable email/SMS notifications for managers

## Notes
- LetisPOS follows FEFO (First Expired, First Out) automatically
- Expiry alerts appear on the dashboard and in the assistant briefing
- Recording waste requires the `inventory.write` permission
```

- [ ] **Step 6: Create products/managing-barcodes.md**

```markdown
---
title: Managing Barcodes
category: products
tags: [barcode, SKU, scanning, label]
---

# Managing Barcodes

## Supported Barcode Types
- CODE128 (default, recommended for most products)
- EAN-13 (international standard)
- EAN-8 (small products)
- UPC-A / UPC-E (common on imported goods)
- QR Code (for custom encoding)

## Adding Barcodes to Products
1. Go to Products > select a product > Edit
2. In the Barcode field, you can:
   - Type a barcode number manually
   - Scan a barcode using a USB scanner (it fills automatically)
   - Generate an automatic barcode by clicking "Generate"

## Printing Barcode Labels
1. Select one or more products in the product list
2. Click "Print Labels" from the toolbar
3. Choose label size (standard 50x25mm or custom)
4. Choose how many copies per product
5. Preview and print

## Notes
- Barcodes must be unique — the system rejects duplicates
- If you need to re-use a barcode, first remove it from the old product
- Barcode scanning works in POS checkout, receiving stock, and stock counting
- GS1 barcodes with embedded weights/expiry dates are supported for fresh produce
```

- [ ] **Step 7: Commit**

```bash
git add backend/ai-service/src/main/resources/knowledge/
git commit -m "feat: add initial knowledge base articles (sales, inventory, products)"
```

---

### Task 19: Integrate KnowledgeBase into AssistantService

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java`
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantPromptBuilder.java`

- [ ] **Step 1: Wire KnowledgeBase into AssistantService**

Add `private final KnowledgeBase knowledgeBase;` to AssistantService's constructor.

In `chat()`, after intent classification, search the knowledge base:

```java
// Search knowledge base when user is asking a HELP question or confidence is low
List<String> knowledgeChunks = List.of();
if (intent.primaryDomain() == IntentClassification.Domain.HELP || intent.confidence() < 0.6) {
    knowledgeChunks = knowledgeBase.search(request.message(), intent.primaryDomain().name());
}
```

- [ ] **Step 2: Pass knowledge chunks to PromptBuilder**

Add a `knowledgeChunks` parameter to the enhanced `build()` method in `AssistantPromptBuilder`:

```java
if (knowledgeChunks != null && !knowledgeChunks.isEmpty()) {
    sb.append("\nUse the following knowledge to answer:\n");
    for (int i = 0; i < knowledgeChunks.size(); i++) {
        sb.append("[").append(i + 1).append("] ").append(knowledgeChunks.get(i)).append("\n");
    }
}
```

- [ ] **Step 3: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java \
        backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantPromptBuilder.java
git commit -m "feat: integrate knowledge base into assistant flow"
```

---

### Task 20: Proactive alerts (Phase 3)

**Files:**
- Modify: `backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java`

- [ ] **Step 1: Add proactive alert injection for owner/manager roles**

In `chat()`, when the conversation is new (no `conversationIdParam`), and the user is OWNER or MANAGER, call `getExecutiveBriefing` and inject as the initial assistant response:

```java
// Proactive alert for owner/manager on new conversation
if (conversationIdParam == null
    && (profile == RoleProfile.OWNER || profile == RoleProfile.MANAGER)) {
    try {
        var briefing = toolExecutor.execute("getExecutiveBriefing",
            Map.of("date", LocalDate.now().minusDays(1).toString()), userId);
        String alert = "Good morning. Here's your briefing for " +
            LocalDate.now().minusDays(1).toString() + ":\n\n" +
            briefing.title() + "\n" +
            briefing.data().get("headline") + "\n\n" +
            briefing.data().get("recommendedAction");
        // Send as initial message in the stream
        emitter.send(SseEmitter.event().name("token")
            .data(Map.of("token", alert)));
    } catch (Exception e) {
        // Silent — briefing is a bonus, not required
        log.debug("Proactive alert skipped: {}", e.getMessage());
    }
}
```

- [ ] **Step 2: Compile**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/AssistantService.java
git commit -m "feat: add proactive alerts for owner and manager roles"
```

---

### Task 21: End-to-end verification

- [ ] **Step 1: Start all services**

Run: `cd backend && docker compose up -d postgres redis`
Expected: Both containers running

- [ ] **Step 2: Start ai-service**

Run: `cd backend/ai-service && OPENAI_API_KEY=sk-test mvn spring-boot:run`
Expected: Service starts on port 8091

- [ ] **Step 3: Test a chat request with conversation memory**

Run:
```bash
# First message (creates conversation)
curl -s -X POST "http://localhost:8091/api/v1/ai/assistant/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-jwt>" \
  -d '{"message": "what are my top products this week?"}'
```

Expected: SSE stream that starts with `event:meta` containing a conversationId.

- [ ] **Step 4: Test follow-up message**

Run with the returned conversationId:
```bash
# Follow-up (uses existing conversation)
curl -s -X POST "http://localhost:8091/api/v1/ai/assistant/chat?conversationId=<uuid>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-jwt>" \
  -d '{"message": "which ones are low in stock?"}'
```

Expected: Assistant understands "ones" refers to the products from the previous response.

- [ ] **Step 5: Test knowledge base with a how-to question**

Run:
```bash
curl -s -X POST "http://localhost:8091/api/v1/ai/assistant/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-jwt>" \
  -d '{"message": "how do I process a refund?"}'
```

Expected: Assistant responds with step-by-step LetisPOS-specific instructions (not generic advice).

- [ ] **Step 6: Run full test suite**

Run: `cd backend/ai-service && mvn test`
Expected: All tests pass.

- [ ] **Step 7: Frontend dev server test**

Run: `cd frontend && npm run dev`
Expected: Open browser, click FAB, send "how do I process a refund?" — verify assistant responds with knowledge base content and conversation continues across multiple exchanges.

- [ ] **Step 8: Commit any final fixes**

```bash
git add -A
git commit -m "chore: end-to-end verification fixes"
```
