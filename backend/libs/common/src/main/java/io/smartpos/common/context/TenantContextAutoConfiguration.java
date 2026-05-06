package io.smartpos.common.context;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnWebApplication
public class TenantContextAutoConfiguration {

    // TenantContextFilter is registered inside Spring Security's filter chain
    // by each service's SecurityConfig so it has access to the authenticated JWT.
    // The FilterRegistrationBean approach runs outside the security chain and
    // cannot reliably access the SecurityContext.
}
