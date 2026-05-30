package io.smartpos.auth.infrastructure.email;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import io.smartpos.auth.application.VerificationEmailSender;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Component
@RequiredArgsConstructor
public class ResendEmailSender implements VerificationEmailSender {

    private final Resend resend;

    @Value("${smartpos.verification.resend.api-key:}")
    private String apiKey;

    @Value("${smartpos.verification.resend.from-address:noreply@send.letispos.com}")
    private String fromAddress;

    @PostConstruct
    void logConfig() {
        if (apiKey != null && !apiKey.isBlank()) {
            log.info("Resend email configured — from={} key_prefix={}...", fromAddress,
                    apiKey.substring(0, Math.min(8, apiKey.length())));
        } else {
            log.warn("Resend API key is NOT configured. Password reset and verification " +
                    "emails will fail. Set 'email.resend.api_key' in Admin → Platform Settings, " +
                    "then restart this service.");
        }
    }

    @Override
    public void sendVerificationEmail(String to, String subject, String htmlBody) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email not configured — set email.resend.api_key in Platform Settings");
        }
        try {
            resend.emails().send(CreateEmailOptions.builder()
                    .from(fromAddress)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build());
            log.info("Email sent — to={} subject={}", to, subject);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send email. Please try again.");
        }
    }
}
