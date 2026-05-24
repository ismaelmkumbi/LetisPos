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
 * There is NO env-var fallback for secrets. The admin panel is the single
 * source of truth. If user-service is unreachable or the settings table is
 * empty, the application will fail to resolve required keys on startup.
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

        Map<String, String> settings;
        try {
            RestTemplate rest = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, String> raw = rest.getForObject(url, Map.class);
            settings = raw;
        } catch (Exception e) {
            log.error("Cannot load platform settings from user-service at {}: {}",
                    url, e.getMessage());
            log.error("The admin panel is the only source for API keys. " +
                    "Make sure user-service is running and the platform_settings table is populated.");
            throw new IllegalStateException(
                    "Platform settings unavailable — user-service must be running before this service. " +
                    "Cause: " + e.getMessage(), e);
        }

        if (settings == null || settings.isEmpty()) {
            log.error("Platform settings table is empty. Configure API keys in Admin → Platform Settings.");
            throw new IllegalStateException(
                    "Platform settings table is empty. " +
                    "A super admin must configure API keys in Admin → Platform Settings before starting services.");
        }

        Map<String, Object> prefixed = new LinkedHashMap<>();
        int loaded = 0;
        for (var entry : settings.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().isBlank()) {
                prefixed.put("platform." + entry.getKey(), entry.getValue());
                loaded++;
            }
        }

        env.getPropertySources()
           .addFirst(new MapPropertySource("platformSettings", prefixed));
        log.info("Loaded {} platform settings from user-service (available as platform.*)", loaded);
    }
}
