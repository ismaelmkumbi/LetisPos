package io.smartpos.auth.infrastructure.sms;

import com.twilio.Twilio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class TwilioConfig {

    @Value("${smartpos.verification.twilio.account-sid}")
    private String accountSid;

    @Value("${smartpos.verification.twilio.auth-token}")
    private String authToken;

    @Value("${smartpos.verification.twilio.phone-number}")
    private String phoneNumber;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }
}
