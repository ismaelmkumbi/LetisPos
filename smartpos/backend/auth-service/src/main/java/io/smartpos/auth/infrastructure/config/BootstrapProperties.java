package io.smartpos.auth.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartpos.auth.bootstrap")
public record BootstrapProperties(String adminEmail, String adminPassword) {}
