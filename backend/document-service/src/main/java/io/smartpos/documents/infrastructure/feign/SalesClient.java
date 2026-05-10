package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "sales-service", url = "${spring.cloud.openfeign.client.config.sales-service.url}")
public interface SalesClient {
    @GetMapping("/api/v1/sales/{id}")
    Map<String, Object> getSale(@PathVariable UUID id);

    @GetMapping("/api/v1/quotations/{id}")
    Map<String, Object> getQuotation(@PathVariable UUID id);
}
