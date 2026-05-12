package io.smartpos.billing;

import io.smartpos.common.audit.JwtAuditorAware;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class BillingApplication {

    @Bean
    public AuditorAware<String> auditorAware() {
        return new JwtAuditorAware();
    }

    public static void main(String[] args) {
        SpringApplication.run(BillingApplication.class, args);
    }
}
