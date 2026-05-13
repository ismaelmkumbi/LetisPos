package io.smartpos.auth.infrastructure.sms;

import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import io.smartpos.auth.application.VerificationSmsSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Component
@RequiredArgsConstructor
public class TwilioSmsSender implements VerificationSmsSender {

    private final TwilioConfig twilioConfig;

    @Override
    public void sendVerificationSms(String to, String messageBody) {
        try {
            Message.creator(
                    new PhoneNumber(to),
                    new PhoneNumber(twilioConfig.getPhoneNumber()),
                    messageBody
            ).create();
        } catch (Exception e) {
            log.error("Failed to send verification SMS to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send verification SMS. Please try again.");
        }
    }
}
