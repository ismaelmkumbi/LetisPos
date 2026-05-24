package io.smartpos.ai.infrastructure.config;

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
 * If user-service is unreachable or the table is empty, a warning is logged
 * and the application continues with empty defaults — functionality that
 * requires configured keys will report clear errors at runtime.
 */
@Slf4j
public class PlatformSettingsLoader implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        // user-service owns the platform_settings table — it reads directly
        // from its own DB, not via HTTP. Skip to avoid circular startup.
        String appName = env.getProperty("spring.application.name", "");
        if ("user-service".equals(appName)) {
            log.info("Skipping platform settings fetch — this is user-service (settings owner).");
            return;
        }

        String userServiceUrl = env.getProperty("USER_SERVICE_URL", "http://user-service:8082");
        String url = userServiceUrl + "/api/internal/platform-settings";

        Map<String, String> settings = null;
        try {
            RestTemplate rest = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, String> raw = rest.getForObject(url, Map.class);
            settings = raw;
        } catch (Exception e) {
            log.warn("Could not load platform settings from user-service at {}: {}. " +
                    "API keys will be empty until user-service is available.", url, e.getMessage());
        }

        if (settings == null || settings.isEmpty()) {
            log.info("No platform settings available — API keys will be empty. " +
                    "Configure them in Admin → Platform Settings.");
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
        }
        log.info("Loaded {} platform settings from user-service (available as platform.*)", loaded);
    }
}
