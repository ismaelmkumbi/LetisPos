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
import java.util.concurrent.*;

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

    /** Health-check compatible with the Control Center UI's getServers() contract. */
    @GetMapping("/{name}/health")
    public Map<String, Object> health(@PathVariable String name) {
        try {
            Agent a = agentService.findByHostname(name);
            return Map.of(
                "server", (Object) a.getHostname(),
                "version", a.getVersion(),
                "status", "online".equals(a.getStatus()) ? "ok" : "degraded"
            );
        } catch (Exception e) {
            return Map.of("status", "offline");
        }
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

    private final ExecutorService portScanExecutor = Executors.newFixedThreadPool(8);

    @GetMapping("/{name}/backend-services")
    public List<Map<String, Object>> listBackendServices(@PathVariable String name) throws InterruptedException {
        List<Map<String, Object>> result = new CopyOnWriteArrayList<>();
        Set<Integer> scanned = ConcurrentHashMap.newKeySet();
        List<Callable<Void>> tasks = new ArrayList<>();

        // Parallel port checks via Docker container names
        for (int port : KNOWN_PORTS.keySet().stream().sorted().toList()) {
            scanned.add(port);
            String containerName = KNOWN_PORTS.get(port).containerName;
            tasks.add(() -> {
                boolean up = checkPort(containerName, port);
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("name", KNOWN_PORTS.get(port).name);
                info.put("containerName", containerName);
                info.put("category", KNOWN_PORTS.get(port).category);
                info.put("port", port);
                info.put("status", up ? "UP" : "DOWN");
                info.put("description", KNOWN_PORTS.get(port).description);
                if (up) {
                    var res = readProcessStats(port);
                    info.put("cpuPercent", res.cpu);
                    info.put("memUsedBytes", res.mem);
                    info.put("pid", res.pid);
                    info.put("command", res.command);
                }
                result.add(info);
                return null;
            });
        }
        // Auto-discovery (localhost — faster, no DNS)
        for (int port = 8080; port <= 8099; port++) {
            if (scanned.contains(port)) continue;
            int p = port;
            tasks.add(() -> {
                if (checkPort("127.0.0.1", p)) {
                    Map<String, Object> info = new LinkedHashMap<>();
                    info.put("name", "Service :" + p);
                    info.put("category", "Other");
                    info.put("port", p);
                    info.put("status", "UP");
                    info.put("description", "Auto-discovered on port " + p);
                    var res = readProcessStats(p);
                    info.put("cpuPercent", res.cpu);
                    info.put("memUsedBytes", res.mem);
                    info.put("pid", res.pid);
                    info.put("command", res.command);
                    result.add(info);
                }
                return null;
            });
        }
        // All tasks complete within 3s total; timed-out tasks are cancelled
        portScanExecutor.invokeAll(tasks, 3, TimeUnit.SECONDS);
        return result;
    }

    private boolean checkPort(String host, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 500);
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
            long utime = Long.parseLong(parts[11]);
            long stime = Long.parseLong(parts[12]);
            long totalCpu = utime + stime;
            long now = System.currentTimeMillis();

            // /proc/<pid>/statm: field 2 is RSS in pages
            String statm = java.nio.file.Files.readString(
                java.nio.file.Path.of("/proc/" + pid + "/statm"));
            String[] sm = statm.trim().split("\\s+");
            long rssPages = Long.parseLong(sm[1]);
            long memBytes = rssPages * 4096;

            // /proc/<pid>/comm: process command name
            String comm = java.nio.file.Files.readString(
                java.nio.file.Path.of("/proc/" + pid + "/comm")).trim();

            double cpu = 0.0;
            String key = "pid-" + pid;
            long[] prev = lastCpu.computeIfAbsent(key, k -> new long[]{totalCpu, now});
            long cpuDelta = totalCpu - prev[0];
            long timeDelta = now - prev[1];
            if (timeDelta > 0 && prev[0] > 0) {
                cpu = (cpuDelta * 10.0 * 100.0) / timeDelta;
                cpu = Math.min(cpu, 100.0 * Runtime.getRuntime().availableProcessors());
            }
            prev[0] = totalCpu; prev[1] = now;
            return new ProcessStats(Math.round(cpu * 10.0) / 10.0, memBytes, pid, comm);
        } catch (Exception e) { return ProcessStats.EMPTY; }
    }

    private final Map<String, long[]> lastCpu = new ConcurrentHashMap<>();
    private record ProcessStats(double cpu, long mem, long pid, String command) {
        static final ProcessStats EMPTY = new ProcessStats(0, 0, 0, "");
    }

    private record ServiceMeta(String name, String containerName, String category, String description) {}
    private static final Map<Integer, ServiceMeta> KNOWN_PORTS = new LinkedHashMap<>();
    static {
        KNOWN_PORTS.put(8080, new ServiceMeta("Gateway",              "letispos-gateway",         "Core",        "API Gateway / Router"));
        KNOWN_PORTS.put(8081, new ServiceMeta("Auth Service",         "letispos-auth",             "Core",        "Authentication & JWT"));
        KNOWN_PORTS.put(8082, new ServiceMeta("User Service",         "letispos-user",             "Core",        "Users, Roles & Permissions"));
        KNOWN_PORTS.put(8083, new ServiceMeta("Product Service",      "letispos-product",          "Catalog",     "Products, Categories, Brands"));
        KNOWN_PORTS.put(8084, new ServiceMeta("Inventory Service",    "letispos-inventory",        "Inventory",   "Stock, Warehouses, Transfers"));
        KNOWN_PORTS.put(8085, new ServiceMeta("Sales Service",        "letispos-sales",            "Sales",       "POS, Sales, Quotations"));
        KNOWN_PORTS.put(8086, new ServiceMeta("Payment Service",      "letispos-payment",          "Finance",     "Payments, Accounts, Expenses"));
        KNOWN_PORTS.put(8087, new ServiceMeta("Report Service",       "letispos-report",           "Insight",     "Reports & Analytics"));
        KNOWN_PORTS.put(8089, new ServiceMeta("Notification Service", "letispos-notification",     "Core",        "Email, SMS, Push Notifications"));
        KNOWN_PORTS.put(8090, new ServiceMeta("HRM Service",          "letispos-hrm",              "People",      "Employees, Attendance, Payroll"));
        KNOWN_PORTS.put(8091, new ServiceMeta("AI Service",           "letispos-ai",               "Intelligence","AI Insights & Automation"));
        KNOWN_PORTS.put(8092, new ServiceMeta("Integration Service",  "letispos-integration",      "Platform",    "Third-party Integrations"));
        KNOWN_PORTS.put(8093, new ServiceMeta("Document Service",     "letispos-document",         "Documents",   "PDF Generation & Templates"));
        KNOWN_PORTS.put(8094, new ServiceMeta("Billing Service",      "letispos-billing",          "Finance",     "Plans, Subscriptions & Billing"));
        KNOWN_PORTS.put(8098, new ServiceMeta("Control Hub",          "letispos-control-hub",      "Platform",    "Letis Control Center Hub"));
        KNOWN_PORTS.put(9100, new ServiceMeta("LSA Agent",            "lsa-agent",                 "Platform",    "Server Monitoring Agent"));
    }
}
