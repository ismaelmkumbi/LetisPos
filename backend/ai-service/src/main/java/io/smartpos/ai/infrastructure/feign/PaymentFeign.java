package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@FeignClient(name = "payment-service",
    url = "${smartpos.ai.payment-service-url:http://localhost:8086}")
public interface PaymentFeign {

    @PostMapping("/api/v1/expenses")
    void createExpense(@RequestParam String category, @RequestParam BigDecimal amount,
                       @RequestParam(required = false) String description);
}
