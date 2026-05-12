package io.smartpos.billing.infrastructure.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "smartpos.billing.daraja")
public record DarajaProperties(
    boolean enabled,
    String consumerKey,
    String consumerSecret,
    String passkey,
    String shortcode,
    String environment,
    String authUrl,
    String stkPushUrl,
    String queryUrl
) {
    public DarajaProperties() {
        this(false, "", "", "", "174379", "sandbox",
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query");
    }
}
