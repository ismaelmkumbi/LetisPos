package io.smartpos.integration.application;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "smartpos.integration")
public record IntegrationProperties(
        Zatca zatca,
        WooCommerce woocommerce,
        QuickBooks quickbooks
) {
    public record Zatca(
            @DefaultValue("false") boolean enabled,
            String vatNumber,
            String sellerName) {}

    public record WooCommerce(
            @DefaultValue("false") boolean enabled,
            String siteUrl,
            String consumerKey,
            String consumerSecret) {}

    public record QuickBooks(
            @DefaultValue("false") boolean enabled,
            String baseUrl,
            String companyId,
            String accessToken) {}
}
