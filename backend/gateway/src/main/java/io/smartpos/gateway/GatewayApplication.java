package io.smartpos.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import reactor.core.publisher.Mono;

@SpringBootApplication
@EnableScheduling
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }

    /** Rate-limit key = client IP (from X-Forwarded-For or remote address). */
    @Bean
    public KeyResolver clientIpKeyResolver() {
        return exchange -> {
            String xff = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return Mono.just(xff.split(",")[0].trim());
            }
            return Mono.just(exchange.getRequest().getRemoteAddress() == null
                    ? "unknown"
                    : exchange.getRequest().getRemoteAddress().getAddress().getHostAddress());
        };
    }
}
