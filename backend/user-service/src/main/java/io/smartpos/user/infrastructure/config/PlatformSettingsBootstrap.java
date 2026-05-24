package io.smartpos.user.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.sql.*;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * user-service owns the platform_settings table.
 * Reads settings via plain JDBC before the Spring context is created,
 * avoiding the circular HTTP call that other services use.
 *
 * Registered via META-INF/spring.factories (same mechanism as the common lib
 * loader, but takes precedence because user-service's classpath is first).
 */
@Slf4j
public class PlatformSettingsBootstrap implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        String dbUrl = env.getProperty("spring.datasource.url", "");
        String dbUser = env.getProperty("spring.datasource.username", "");
        String dbPass = env.getProperty("spring.datasource.password", "");

        if (dbUrl.isBlank()) {
            log.info("No datasource configured — skipping platform settings bootstrap");
            return;
        }

        try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPass);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT key, value FROM platform_settings WHERE value IS NOT NULL AND value <> ''")) {

            Map<String, Object> prefixed = new LinkedHashMap<>();
            int loaded = 0;
            while (rs.next()) {
                prefixed.put("platform." + rs.getString("key"), rs.getString("value"));
                loaded++;
            }

            if (!prefixed.isEmpty()) {
                env.getPropertySources()
                   .addFirst(new MapPropertySource("platformSettings", prefixed));
                log.info("Loaded {} platform settings from local DB (available as platform.*)", loaded);
            } else {
                log.info("platform_settings table is empty — configure keys in Admin → Platform Settings");
            }
        } catch (Exception e) {
            log.warn("Could not load platform settings from local DB: {}. " +
                    "Run V17 migration and seed platform_settings before starting.", e.getMessage());
        }
    }
}
