package io.smartpos.auth.infrastructure.email;

import com.resend.Resend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ResendConfig {

    @Value("${smartpos.verification.resend.api-key}")
    private String apiKey;

    @Bean
    public Resend resend() {
        return new Resend(apiKey);
    }

    @Bean
    public String resendFromAddress(@Value("${smartpos.verification.resend.from-address:onboarding@resend.dev}") String from) {
        return from;
    }
}
