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
