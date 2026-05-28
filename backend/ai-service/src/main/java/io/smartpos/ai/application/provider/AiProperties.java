package io.smartpos.ai.application.provider;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Provider config — switch between Anthropic, OpenAI, DeepSeek, or a
 * deterministic stub (handy for local dev without billable API keys).
 *
 * Active provider is picked by {@code smartpos.ai.provider} which defaults
 * to {@code stub}; set the matching API key via env vars.
 */
@ConfigurationProperties(prefix = "smartpos.ai")
public record AiProperties(
        @DefaultValue("stub") String provider,
        Anthropic anthropic,
        OpenAi openai,
        DeepSeek deepseek,
        Kimi kimi
) {
    public record Anthropic(
            String apiKey,
            @DefaultValue("claude-sonnet-4-6") String model,
            @DefaultValue("16000") int maxTokens) {}

    public record OpenAi(
            String apiKey,
            @DefaultValue("gpt-4o-mini") String model,
            @DefaultValue("https://api.openai.com/v1") String baseUrl) {}

    /**
     * DeepSeek uses an OpenAI-compatible Chat Completions API, so we only
     * need the key + model name + base URL. {@code baseUrl} stays
     * configurable in case DeepSeek changes the endpoint or the user wants
     * to point at a self-hosted gateway.
     */
    public record DeepSeek(
            String apiKey,
            @DefaultValue("deepseek-chat") String model,
            @DefaultValue("https://api.deepseek.com/v1") String baseUrl) {}

    /**
     * Kimi (Moonshot AI) uses an OpenAI-compatible Chat Completions API.
     */
    public record Kimi(
            String apiKey,
            @DefaultValue("moonshot-v1-8k") String model,
            @DefaultValue("https://api.moonshot.cn/v1") String baseUrl) {}
}
