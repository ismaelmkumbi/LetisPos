package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.*;

@RestController
@RequestMapping("/api/v1/commerce/analytics")
@RequiredArgsConstructor
public class CommerceAnalyticsController {

    private final StoreService storeService;
    private final RestClient.Builder restClientBuilder;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('commerce.analytics')")
    public ResponseEntity<Map<String, Object>> summary(@RequestParam(defaultValue = "30d") String period) {
        UUID tenantId = TenantContext.require();
        // Query sales-service for online orders
        Map<String, Object> response = new LinkedHashMap<>();
        try {
            var client = restClientBuilder.build();
            // Try to get sales data filtered by channel=ONLINE
            Map<String, Object> salesData = client.get()
                .uri("/api/v1/sales?channel=ONLINE&size=1000")
                .retrieve()
                .body(Map.class);

            if (salesData != null && salesData.containsKey("totalElements")) {
                long totalOrders = ((Number) salesData.get("totalElements")).longValue();
                response.put("totalOrders", totalOrders);
                response.put("totalRevenue", 0.0);
                response.put("averageOrderValue", totalOrders > 0 ? 0.0 : 0.0);
                response.put("conversionRate", 0.0);
            }
        } catch (Exception e) {
            // Sales service unavailable — return zeros
            response.put("totalOrders", 0);
            response.put("totalRevenue", 0.0);
            response.put("averageOrderValue", 0.0);
            response.put("conversionRate", 0.0);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasAuthority('commerce.analytics')")
    public ResponseEntity<List<Map<String, Object>>> topProducts(@RequestParam(defaultValue = "30d") String period) {
        return ResponseEntity.ok(List.of()); // MVP: return empty until sales analytics are implemented
    }

    @GetMapping("/orders-over-time")
    @PreAuthorize("hasAuthority('commerce.analytics')")
    public ResponseEntity<List<Map<String, Object>>> ordersOverTime(@RequestParam(defaultValue = "30d") String period) {
        return ResponseEntity.ok(List.of()); // MVP: return empty
    }
}
