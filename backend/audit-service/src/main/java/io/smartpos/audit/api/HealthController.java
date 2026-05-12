package io.smartpos.audit.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
public class HealthController {

    @GetMapping("/api/v1/admin/system-status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ServiceStatus>> getStatus() {
        return ResponseEntity.ok(List.of(
                new ServiceStatus("API Gateway", "operational", 99.99, Instant.now()),
                new ServiceStatus("Database", "operational", 99.95, Instant.now()),
                new ServiceStatus("Storage", "operational", 99.9, Instant.now()),
                new ServiceStatus("Email Service", "operational", 99.8, Instant.now()),
                new ServiceStatus("SMS Service", "operational", 99.7, Instant.now()),
                new ServiceStatus("Payment Processing", "operational", 99.99, Instant.now())
        ));
    }

    public record ServiceStatus(
            String name,
            String status,
            double uptime,
            Instant lastChecked
    ) {}
}
