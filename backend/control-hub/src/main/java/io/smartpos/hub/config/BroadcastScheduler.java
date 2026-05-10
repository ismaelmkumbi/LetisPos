package io.smartpos.hub.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.hub.application.AgentService;
import io.smartpos.hub.ws.MetricsWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class BroadcastScheduler {

    private final AgentService agentService;
    private final MetricsWebSocketHandler wsHandler;
    private final ObjectMapper mapper = new ObjectMapper();

    @Scheduled(fixedRate = 5_000)
    @SneakyThrows
    public void pushStatus() {
        var agents = agentService.findAll().stream()
            .map(a -> Map.of(
                "hostname", a.getHostname(),
                "status", a.getStatus(),
                "lastSeen", a.getLastSeen().toString()
            ))
            .toList();
        wsHandler.broadcast(mapper.writeValueAsString(Map.of(
            "type", "servers",
            "data", agents
        )));
    }
}
