package io.smartpos.auth.infrastructure.whatsapp;

import io.smartpos.auth.application.VerificationSmsSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Component
@RequiredArgsConstructor
public class WhatsAppOtpSender implements VerificationSmsSender {

    private final MetaWhatsAppClient whatsappClient;

    @Override
    public void sendVerificationSms(String to, String messageBody) {
        try {
            whatsappClient.send(to, messageBody);
        } catch (Exception e) {
            log.error("Failed to send verification WhatsApp to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send WhatsApp verification. Please try again.");
        }
    }
}
