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

    private static final int LSA_PORT = 9101;

    private final ProxyService proxyService;
    private final AgentService agentService;

    private String agentHost(Agent a) {
        String ip = a.getIpAddress();
        // When control-hub runs in Docker, the LSA agent is on the host.
        // Docker bridge gateway (172.18.0.1) reaches host-bound ports reliably.
        if (ip == null || ip.startsWith("0:") || ip.startsWith("127.") || ip.equals("::1") || ip.equals("localhost")) {
            return "172.18.0.1";
        }
        if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) {
            return "172.18.0.1";
        }
        return ip;
    }

    @PostMapping("/services/{svc}/restart")
    public ResponseEntity<String> restart(@PathVariable String serverName,
                                           @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), LSA_PORT, svc + "/restart");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/services/{svc}/stop")
    public ResponseEntity<String> stop(@PathVariable String serverName,
                                        @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), LSA_PORT, svc + "/stop");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/services/{svc}/start")
    public ResponseEntity<String> start(@PathVariable String serverName,
                                         @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), LSA_PORT, svc + "/start");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/logs/{svc}")
    public ResponseEntity<String> logs(@PathVariable String serverName,
                                        @PathVariable String svc,
                                        @RequestParam(defaultValue = "100") int tail,
                                        @RequestParam(required = false) String filter,
                                        @RequestParam(defaultValue = "0") String grep) {
        Agent a = agentService.findByHostname(serverName);
        boolean isGrep = "1".equals(grep);
        String result = proxyService.proxyLogs(agentHost(a), LSA_PORT, svc, tail, filter, isGrep);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logs/{svc}/clear")
    public ResponseEntity<String> clearLogs(@PathVariable String serverName,
                                             @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String path = svc.equals("clear-all") ? "/logs/clear-all" : "/logs/clear/" + svc;
        String result = proxyService.proxyPost(agentHost(a), LSA_PORT, path);
        return ResponseEntity.ok(result);
    }
}
