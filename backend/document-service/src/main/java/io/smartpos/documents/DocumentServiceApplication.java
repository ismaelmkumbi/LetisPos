package io.smartpos.documents;

import io.smartpos.common.audit.JwtAuditorAware;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableFeignClients(basePackages = "io.smartpos.documents.infrastructure.feign")
@EnableScheduling
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class DocumentServiceApplication {

    @Bean
    public AuditorAware<String> auditorAware() {
        return new JwtAuditorAware();
    }

    public static void main(String[] args) {
        SpringApplication.run(DocumentServiceApplication.class, args);
    }
}
