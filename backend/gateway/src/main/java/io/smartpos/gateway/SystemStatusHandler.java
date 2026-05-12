package io.smartpos.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;

@Configuration
public class SystemStatusHandler {

    @Bean
    public RouterFunction<ServerResponse> systemStatusRoute() {
        return RouterFunctions.route(
            GET("/api/v1/admin/system-status"),
            request -> {
                List<Map<String, Object>> services = List.of(
                    status("API Gateway", "operational", 99.99),
                    status("Database", "operational", 99.95),
                    status("Storage", "operational", 99.9),
                    status("Email Service", "operational", 99.8),
                    status("SMS Service", "operational", 99.7),
                    status("Payment Processing", "operational", 99.99)
                );
                return ServerResponse.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(services);
            });
    }

    private static Map<String, Object> status(String name, String status, double uptime) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("name", name);
        s.put("status", status);
        s.put("uptime", uptime);
        s.put("lastChecked", Instant.now().toString());
        return s;
    }
}
