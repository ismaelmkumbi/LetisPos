package io.smartpos.hub.api;

import io.smartpos.hub.api.dto.AgentResponse;
import io.smartpos.hub.application.AgentService;
import io.smartpos.hub.application.MetricsService;
import io.smartpos.hub.application.ProxyService;
import io.smartpos.hub.domain.Agent;
import io.smartpos.hub.domain.MetricPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/servers")
@RequiredArgsConstructor
public class ServerController {

    private final AgentService agentService;
    private final MetricsService metricsService;
    private final ProxyService proxyService;

    @GetMapping
    public List<AgentResponse> listServers() {
        return agentService.findAll().stream()
            .map(a -> new AgentResponse(a.getId(), a.getHostname(),
                a.getIpAddress(), a.getVersion(), a.getStatus(), a.getLastSeen()))
            .toList();
    }

    @GetMapping("/{name}")
    public AgentResponse getServer(@PathVariable String name) {
        Agent a = agentService.findByHostname(name);
        return new AgentResponse(a.getId(), a.getHostname(),
            a.getIpAddress(), a.getVersion(), a.getStatus(), a.getLastSeen());
    }

    @GetMapping("/{name}/metrics")
    public List<MetricPoint> getMetrics(
            @PathVariable String name,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        if (from == null) from = Instant.now().minusSeconds(3600);
        if (to == null) to = Instant.now();
        return metricsService.query(name, from, to);
    }

    @GetMapping("/{name}/services")
    public ResponseEntity<String> listServices(@PathVariable String name) {
        Agent a = agentService.findByHostname(name);
        return ResponseEntity.ok(proxyService.proxyGet("127.0.0.1", 9100, "/services"));
    }

    @GetMapping("/{name}/backend-services")
    public List<Map<String, Object>> listBackendServices(@PathVariable String name) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (var svc : BACKEND_SERVICES) {
            boolean up = checkPort("127.0.0.1", svc.port);
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("name", svc.name);
            info.put("category", svc.category);
            info.put("port", svc.port);
            info.put("status", up ? "UP" : "DOWN");
            info.put("description", svc.description);
            result.add(info);
        }
        return result;
    }

    private boolean checkPort(String host, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 2000);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private record BackendService(String name, String category, int port, String description) {}
    private static final List<BackendService> BACKEND_SERVICES = List.of(
        new BackendService("Gateway", "Core", 8080, "API Gateway / Router"),
        new BackendService("Auth Service", "Core", 8081, "Authentication & JWT"),
        new BackendService("User Service", "Core", 8082, "Users, Roles & Permissions"),
        new BackendService("Product Service", "Catalog", 8083, "Products, Categories, Brands"),
        new BackendService("Inventory Service", "Inventory", 8084, "Stock, Warehouses, Transfers"),
        new BackendService("Sales Service", "Sales", 8085, "POS, Sales, Quotations"),
        new BackendService("Payment Service", "Finance", 8086, "Payments, Accounts, Expenses"),
        new BackendService("Report Service", "Insight", 8087, "Reports & Analytics"),
        new BackendService("Notification Service", "Core", 8089, "Email, SMS, Push Notifications"),
        new BackendService("HRM Service", "People", 8090, "Employees, Attendance, Payroll"),
        new BackendService("AI Service", "Intelligence", 8091, "AI Insights & Automation"),
        new BackendService("Integration Service", "Platform", 8092, "Third-party Integrations"),
        new BackendService("Document Service", "Documents", 8093, "PDF Generation & Templates"),
        new BackendService("Billing Service", "Finance", 8094, "Plans, Subscriptions & Billing"),
        new BackendService("Control Hub", "Platform", 8100, "Letis Control Center Hub"),
        new BackendService("LSA Agent", "Platform", 9100, "Server Monitoring Agent")
    );
}
