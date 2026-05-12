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
import java.util.concurrent.ConcurrentHashMap;

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

    /**
     * Discovers services by scanning known ports + any additional port in range
     * that is open. Known ports get proper names; unknown ones auto-appear as
     * "Service :<port>". Deploy a new service on any port 8080-8099 and it shows
     * up automatically — no code changes required.
     */
    @GetMapping("/{name}/processes")
    public List<Map<String, Object>> listProcesses(@PathVariable String name) {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            var proc = new ProcessBuilder("sh", "-c",
                "ps -eo pid,pcpu,rss,comm --sort=-pcpu --no-headers 2>/dev/null | grep java | head -30").start();
            String out = new String(proc.getInputStream().readAllBytes());
            for (String line : out.split("\n")) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] parts = line.split("\\s+", 4);
                if (parts.length < 4) continue;
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("pid", Integer.parseInt(parts[0]));
                p.put("cpuPercent", Double.parseDouble(parts[1]));
                p.put("memKB", Long.parseLong(parts[2]));
                p.put("command", parts[3]);
                result.add(p);
            }
        } catch (Exception e) { /* return empty */ }
        return result;
    }

    @GetMapping("/{name}/backend-services")
    public List<Map<String, Object>> listBackendServices(@PathVariable String name) {
        List<Map<String, Object>> result = new ArrayList<>();
        Set<Integer> scanned = new LinkedHashSet<>();
        // Always scan known ports first (even if down, show them)
        for (int port : KNOWN_PORTS.keySet().stream().sorted().toList()) {
            scanned.add(port);
            boolean up = checkPort("127.0.0.1", port);
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("name", KNOWN_PORTS.get(port).name);
            info.put("category", KNOWN_PORTS.get(port).category);
            info.put("port", port);
            info.put("status", up ? "UP" : "DOWN");
            info.put("description", KNOWN_PORTS.get(port).description);
            if (up) {
                var res = readProcessStats(port);
                info.put("cpuPercent", res.cpu);
                info.put("memUsedBytes", res.mem);
            }
            result.add(info);
        }
        // Also discover any unknown open ports in range
        for (int port = 8080; port <= 8099; port++) {
            if (scanned.contains(port)) continue;
            if (checkPort("127.0.0.1", port)) {
                scanned.add(port);
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("name", "Service :" + port);
                info.put("category", "Other");
                info.put("port", port);
                info.put("status", "UP");
                info.put("description", "Auto-discovered on port " + port);
                var res = readProcessStats(port);
                info.put("cpuPercent", res.cpu);
                info.put("memUsedBytes", res.mem);
                result.add(info);
            }
        }
        return result;
    }

    private boolean checkPort(String host, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 2000);
            return true;
        } catch (Exception e) { return false; }
    }

    /** Finds the PID listening on a port and reads its CPU% and RSS memory. */
    private ProcessStats readProcessStats(int port) {
        try {
            var proc = new ProcessBuilder("lsof", "-ti", ":" + port).start();
            String pidStr = new String(proc.getInputStream().readAllBytes()).trim();
            if (pidStr.isEmpty()) return ProcessStats.EMPTY;
            // Take first PID if multiple returned
            String firstLine = pidStr.split("\\R")[0];
            long pid = Long.parseLong(firstLine);
            return readProcStats(pid);
        } catch (Exception e) { return ProcessStats.EMPTY; }
    }

    private ProcessStats readProcStats(long pid) {
        try {
            // /proc/<pid>/stat: fields 14 (utime) + 15 (stime) in clock ticks
            String stat = java.nio.file.Files.readString(
                java.nio.file.Path.of("/proc/" + pid + "/stat"));
            String[] parts = stat.substring(stat.lastIndexOf(')') + 2).split(" ");
            long utime = Long.parseLong(parts[11]); // field 14 (0-indexed: 11 after ')')
            long stime = Long.parseLong(parts[12]); // field 15
            long totalCpu = utime + stime;
            long now = System.currentTimeMillis();

            // /proc/<pid>/statm: field 2 is RSS in pages
            String statm = java.nio.file.Files.readString(
                java.nio.file.Path.of("/proc/" + pid + "/statm"));
            String[] sm = statm.trim().split("\\s+");
            long rssPages = Long.parseLong(sm[1]);
            long memBytes = rssPages * 4096; // 4KB pages

            // Compute CPU% from delta since last call
            double cpu = 0.0;
            String key = "pid-" + pid;
            long[] prev = lastCpu.get(key);
            if (prev != null) {
                long cpuDelta = totalCpu - prev[0];
                long timeDelta = now - prev[1];
                if (timeDelta > 0) {
                    // cpuDelta ticks * 10ms/tick * 100 / timeDelta = % of one core
                    cpu = (cpuDelta * 10.0 * 100.0) / timeDelta;
                    cpu = Math.min(cpu, 100.0 * Runtime.getRuntime().availableProcessors());
                }
            }
            lastCpu.put(key, new long[]{totalCpu, now});
            return new ProcessStats(Math.round(cpu * 10.0) / 10.0, memBytes);
        } catch (Exception e) { return ProcessStats.EMPTY; }
    }

    private final Map<String, long[]> lastCpu = new ConcurrentHashMap<>();
    private record ProcessStats(double cpu, long mem) {
        static final ProcessStats EMPTY = new ProcessStats(0, 0);
    }

    private record ServiceMeta(String name, String category, String description) {}
    private static final Map<Integer, ServiceMeta> KNOWN_PORTS = new LinkedHashMap<>();
    static {
        KNOWN_PORTS.put(8080, new ServiceMeta("Gateway", "Core", "API Gateway / Router"));
        KNOWN_PORTS.put(8081, new ServiceMeta("Auth Service", "Core", "Authentication & JWT"));
        KNOWN_PORTS.put(8082, new ServiceMeta("User Service", "Core", "Users, Roles & Permissions"));
        KNOWN_PORTS.put(8083, new ServiceMeta("Product Service", "Catalog", "Products, Categories, Brands"));
        KNOWN_PORTS.put(8084, new ServiceMeta("Inventory Service", "Inventory", "Stock, Warehouses, Transfers"));
        KNOWN_PORTS.put(8085, new ServiceMeta("Sales Service", "Sales", "POS, Sales, Quotations"));
        KNOWN_PORTS.put(8086, new ServiceMeta("Payment Service", "Finance", "Payments, Accounts, Expenses"));
        KNOWN_PORTS.put(8087, new ServiceMeta("Report Service", "Insight", "Reports & Analytics"));
        KNOWN_PORTS.put(8089, new ServiceMeta("Notification Service", "Core", "Email, SMS, Push Notifications"));
        KNOWN_PORTS.put(8090, new ServiceMeta("HRM Service", "People", "Employees, Attendance, Payroll"));
        KNOWN_PORTS.put(8091, new ServiceMeta("AI Service", "Intelligence", "AI Insights & Automation"));
        KNOWN_PORTS.put(8092, new ServiceMeta("Integration Service", "Platform", "Third-party Integrations"));
        KNOWN_PORTS.put(8093, new ServiceMeta("Document Service", "Documents", "PDF Generation & Templates"));
        KNOWN_PORTS.put(8094, new ServiceMeta("Billing Service", "Finance", "Plans, Subscriptions & Billing"));
        KNOWN_PORTS.put(8100, new ServiceMeta("Control Hub", "Platform", "Letis Control Center Hub"));
        KNOWN_PORTS.put(9100, new ServiceMeta("LSA Agent", "Platform", "Server Monitoring Agent"));
    }
}
