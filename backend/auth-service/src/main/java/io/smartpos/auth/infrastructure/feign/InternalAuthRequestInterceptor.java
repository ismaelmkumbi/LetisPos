package io.smartpos.auth.infrastructure.feign;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

/**
 * Adds the {@code X-Internal-Token} header to every Feign call made with the
 * {@link UserServiceClient}. The value must match the receiving service's
 * {@code smartpos.internal.shared-secret}.
 *
 * Keep the secret out of logs. We don't print it anywhere here; Feign's
 * default logging redacts request headers unless you opt in.
 */
@Component
public class InternalAuthRequestInterceptor implements RequestInterceptor {

    @Value("${smartpos.internal.shared-secret:dev-internal-token-change-me}")
    private String sharedSecret;

    @Override
    public void apply(RequestTemplate template) {
        if (sharedSecret != null && !sharedSecret.isBlank()) {
            template.header("X-Internal-Token", sharedSecret);
        }
    }

    /**
     * Registered per-Feign-client via {@code configuration} attribute so the
     * interceptor only fires on calls that need it (not on user-originated
     * Feign clients, should we add any later).
     */
    public static class Config {
        @Bean
        public RequestInterceptor smartposInternalTokenInterceptor() {
            return new InternalAuthRequestInterceptor();
        }
    }
}
