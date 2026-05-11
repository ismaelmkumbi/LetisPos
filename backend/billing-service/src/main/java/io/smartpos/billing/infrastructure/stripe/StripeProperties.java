package io.smartpos.billing.infrastructure.stripe;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "smartpos.billing.stripe")
public record StripeProperties(
    boolean enabled,
    String secretKey,
    String webhookSecret,
    String priceStarterMonthly,
    String priceStarterAnnual,
    String priceBusinessMonthly,
    String priceBusinessAnnual,
    String priceProfessionalMonthly,
    String priceProfessionalAnnual,
    String priceEnterpriseMonthly
) {
    public StripeProperties() {
        this(false, "", "", "", "", "", "", "", "", "");
    }
}
