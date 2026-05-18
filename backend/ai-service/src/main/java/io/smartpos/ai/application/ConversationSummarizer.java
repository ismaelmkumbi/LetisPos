package io.smartpos.ai.application;

import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
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

        // Short conversations don't need AI summarization
        if (transcript.length() < 500) return transcript;

        try {
            AiProvider provider = aiRouter.byName("deepseek");
            if (provider == null) {
                log.warn("DeepSeek provider not available for conversation summarization, using fallback");
                return truncateFallback(messages);
            }
            AiProvider.Result result = provider.complete(SUMMARIZE_PROMPT, transcript);
            if (result.text() == null) {
                log.warn("DeepSeek summarization returned null text, using fallback");
                return truncateFallback(messages);
            }
            return result.text().trim();
        } catch (Exception e) {
            log.warn("Conversation summarization failed, using fallback", e);
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
