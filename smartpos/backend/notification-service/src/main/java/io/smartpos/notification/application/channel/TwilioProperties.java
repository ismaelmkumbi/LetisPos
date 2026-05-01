package io.smartpos.notification.application.channel;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Twilio credentials for both SMS + WhatsApp dispatchers.
 * Populated from {@code smartpos.notification.twilio.*} in application.yml.
 */
@ConfigurationProperties(prefix = "smartpos.notification.twilio")
public record TwilioProperties(
        String accountSid,
        String authToken,
        String smsFrom,
        String whatsappFrom
) {}
