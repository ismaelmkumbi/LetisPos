package io.smartpos.auth.infrastructure.email;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import io.smartpos.auth.application.VerificationEmailSender;
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

    @Value("${smartpos.verification.resend.from-address:onboarding@resend.dev}")
    private String fromAddress;

    @Override
    public void sendVerificationEmail(String to, String subject, String htmlBody) {
        try {
            resend.emails().send(CreateEmailOptions.builder()
                    .from(fromAddress)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build());
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send verification email. Please try again.");
        }
    }
}
