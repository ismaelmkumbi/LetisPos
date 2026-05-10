package io.smartpos.hub.api;

import io.smartpos.hub.application.AgentService;
import io.smartpos.hub.application.ProxyService;
import io.smartpos.hub.domain.Agent;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/servers/{serverName}")
@RequiredArgsConstructor
public class ProxyController {

    private final ProxyService proxyService;
    private final AgentService agentService;

    private String agentHost(Agent a) {
        String ip = a.getIpAddress();
        if (ip == null || ip.startsWith("0:") || ip.startsWith("127.") || ip.equals("::1") || ip.equals("localhost")) {
            return "127.0.0.1";
        }
        return ip;
    }

    @PostMapping("/services/{svc}/restart")
    public ResponseEntity<String> restart(@PathVariable String serverName,
                                           @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), 9100, svc + "/restart");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/services/{svc}/stop")
    public ResponseEntity<String> stop(@PathVariable String serverName,
                                        @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), 9100, svc + "/stop");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/services/{svc}/start")
    public ResponseEntity<String> start(@PathVariable String serverName,
                                         @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), 9100, svc + "/start");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/logs/{svc}")
    public ResponseEntity<String> logs(@PathVariable String serverName,
                                        @PathVariable String svc,
                                        @RequestParam(defaultValue = "100") int tail,
                                        @RequestParam(required = false) String filter) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyLogs(agentHost(a), 9100, svc, tail, filter);
        return ResponseEntity.ok(result);
    }
}
