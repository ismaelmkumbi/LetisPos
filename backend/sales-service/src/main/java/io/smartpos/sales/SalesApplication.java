package io.smartpos.sales;

import io.smartpos.common.audit.JwtAuditorAware;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching
@EnableFeignClients(basePackages = "io.smartpos.sales.infrastructure.feign")
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class SalesApplication {

    @Bean
    public AuditorAware<String> auditorAware() {
        return new JwtAuditorAware();
    }

    public static void main(String[] args) {
        SpringApplication.run(SalesApplication.class, args);
    }
}
