package io.smartpos.hub.api;

import io.smartpos.hub.api.dto.HeartbeatRequest;
import io.smartpos.hub.application.AgentService;
import io.smartpos.hub.application.MetricsService;
import io.smartpos.hub.domain.Agent;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;
    private final MetricsService metricsService;

    @PostMapping("/heartbeat")
    public ResponseEntity<Map<String, String>> heartbeat(
            @RequestBody HeartbeatRequest req,
            HttpServletRequest httpReq) {
        String ip = httpReq.getRemoteAddr();
        Agent agent = agentService.registerOrUpdate(req.server(), ip, req.version());
        if (req.metrics() != null) {
            metricsService.store(req.server(), req.metrics());
        }
        return ResponseEntity.ok(Map.of("status", "ok", "agent_id", agent.getId().toString()));
    }
}
