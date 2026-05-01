package io.smartpos.payment.infrastructure.stripe;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartpos.payment.stripe")
public record StripeProperties(boolean enabled, String secretKey, String webhookSecret) {}
