package io.smartpos.auth.infrastructure.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartpos.verification.whatsapp")
public record MetaWhatsAppProperties(
        /** Permanent access token from Meta Business Developer dashboard */
        String accessToken,
        /** WhatsApp Business phone number ID (not the phone number itself) */
        String phoneNumberId,
        /** WhatsApp Business Account ID */
        String wabaId
) {}
