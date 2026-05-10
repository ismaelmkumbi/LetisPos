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

import java.time.Instant;
import java.util.List;

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
        // Agent runs on same server, always use localhost
        return ResponseEntity.ok(proxyService.proxyGet("127.0.0.1", 9100, "/services"));
    }
}
