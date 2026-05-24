package io.smartpos.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fetches platform settings from the user-service internal API BEFORE the
 * application context is created, so they are available as {@code platform.*}
 * properties during YAML resolution.
 *
 * Usage in application.yml:
 *   api-key: ${platform.ai.openai.api_key:${OPENAI_API_KEY:}}
 *
 * DB value wins when present; env var is the fallback.
 */
@Slf4j
public class PlatformSettingsLoader implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        String userServiceUrl = env.getProperty("USER_SERVICE_URL", "http://user-service:8082");
        String url = userServiceUrl + "/api/internal/platform-settings";

        try {
            RestTemplate rest = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, String> settings = rest.getForObject(url, Map.class);
            if (settings == null || settings.isEmpty()) {
                log.info("Platform settings API returned empty — using env vars only");
                return;
            }

            Map<String, Object> prefixed = new LinkedHashMap<>();
            int loaded = 0;
            for (var entry : settings.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isBlank()) {
                    prefixed.put("platform." + entry.getKey(), entry.getValue());
                    loaded++;
                }
            }

            if (!prefixed.isEmpty()) {
                env.getPropertySources()
                   .addFirst(new MapPropertySource("platformSettings", prefixed));
                log.info("Loaded {} platform settings from user-service (available as platform.*)", loaded);
            }
        } catch (Exception e) {
            log.warn("Could not load platform settings from user-service at {}: {}. Using env vars only.",
                    url, e.getMessage());
        }
    }
}
