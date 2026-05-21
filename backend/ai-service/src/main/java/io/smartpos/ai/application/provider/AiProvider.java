package io.smartpos.ai.application.provider;

/**
 * Single point of contact for whichever LLM is configured.
 * Implementations: AnthropicProvider, OpenAiProvider, StubProvider.
 */
import java.util.List;
import java.util.Map;

public interface AiProvider {

    String name();

    String model();

    /** Synchronous completion — returns the assistant message text. */
    Result complete(String systemPrompt, String userPrompt);

    /**
     * Synchronous completion that asks the model to return strict JSON.
     * Default impl falls back to {@link #complete} for providers that don't
     * support JSON-mode natively.
     */
    default Result completeJson(String systemPrompt, String userPrompt) {
        return complete(systemPrompt, userPrompt);
    }

    /**
     * JSON-mode completion enriched with one or more images. {@code imageDataUrls}
     * are passed through verbatim — accepts either {@code data:image/...;base64,...}
     * URIs or external https URLs the model can fetch. Providers that don't
     * support vision should throw {@link UnsupportedOperationException}.
     */
    default Result completeJsonWithImages(String systemPrompt, String userPrompt,
                                          java.util.List<String> imageDataUrls) {
        throw new UnsupportedOperationException(
                "Provider " + name() + " does not support vision input");
    }

    record Result(String text, Integer promptTokens, Integer completionTokens) {}

    /** Completion with OpenAI function-calling tools. */
    default ToolCallResult completeWithTools(String systemPrompt, String userPrompt,
            java.util.List<java.util.Map<String, Object>> tools) {
        throw new UnsupportedOperationException(
                "Provider " + name() + " does not support tool calling");
    }

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

    record ToolCallResult(String text, java.util.List<ToolCall> toolCalls,
                          Integer promptTokens, Integer completionTokens) {}

    record ToolCall(String id, String name, String arguments) {}

    /** Callback for streaming tokens as they arrive from the LLM. */
    @FunctionalInterface
    interface TokenCallback {
        void onToken(String token);
    }

    /**
     * Streaming variant of {@link #completeWithTools}. Providers that support
     * streaming should call {@code onToken} for each text delta as it arrives.
     * The default implementation falls back to the synchronous path and
     * delivers the full text as a single token.
     */
    default ToolCallResult completeWithToolsStreaming(
            String systemPrompt,
            List<Map<String, Object>> messages,
            List<Map<String, Object>> tools,
            TokenCallback onToken) {
        ToolCallResult result = completeWithTools(systemPrompt, messages, tools);
        if (result.text() != null && !result.text().isBlank()) {
            onToken.onToken(result.text());
        }
        return result;
    }
}
