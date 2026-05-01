package io.smartpos.payment.infrastructure.config;

import io.smartpos.payment.infrastructure.stripe.StripeProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({StripeProperties.class})
public class AppConfig {
}
