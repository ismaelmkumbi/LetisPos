package io.smartpos.product;

import io.smartpos.common.audit.JwtAuditorAware;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableCaching
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class ProductApplication {

    @Bean
    public AuditorAware<String> auditorAware() {
        return new JwtAuditorAware();
    }

    public static void main(String[] args) {
        SpringApplication.run(ProductApplication.class, args);
    }
}
