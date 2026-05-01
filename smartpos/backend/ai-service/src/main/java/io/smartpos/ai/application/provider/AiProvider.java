package io.smartpos.ai.application.provider;

/**
 * Single point of contact for whichever LLM is configured.
 * Implementations: AnthropicProvider, OpenAiProvider, StubProvider.
 */
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

    record Result(String text, Integer promptTokens, Integer completionTokens) {}
}
