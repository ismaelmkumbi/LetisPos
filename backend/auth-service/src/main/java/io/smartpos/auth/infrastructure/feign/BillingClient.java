package io.smartpos.auth.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "billing-service", url = "${billing-service.url:http://localhost:8094}",
        configuration = InternalAuthRequestInterceptor.Config.class)
public interface BillingClient {

    @PostMapping("/api/v1/billing/subscriptions/admin")
    Map<String, Object> createSubscription(@RequestBody Map<String, Object> request);
}
