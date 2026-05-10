# Letis Control Hub — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `control-hub` — a Spring Boot service that aggregates metrics from LSA agents, stores time-series data in TimescaleDB, proxies service commands to agents, and pushes real-time updates via WebSocket.

**Architecture:** New Spring Boot 3.3 module added to the existing backend Maven project. Follows the same clean architecture pattern as other services (api → application → domain → infrastructure). JWT auth reuses the existing auth-service. Agent endpoints use a custom HMAC filter.

**Tech Stack:** Spring Boot 3.3.4, Java 21, Spring WebSocket, Spring WebClient, PostgreSQL + TimescaleDB, Flyway, JWT (existing auth-service)

---

## File Structure

| Path | Responsibility |
|------|---------------|
| `backend/control-hub/pom.xml` | Maven module definition |
| `backend/control-hub/src/main/java/io/smartpos/hub/HubApplication.java` | Spring Boot entry point |
| `backend/control-hub/src/main/java/io/smartpos/hub/config/SecurityConfig.java` | JWT + HMAC security |
| `backend/control-hub/src/main/java/io/smartpos/hub/config/WebSocketConfig.java` | WebSocket setup |
| `backend/control-hub/src/main/java/io/smartpos/hub/api/AgentController.java` | Agent heartbeat REST endpoint |
| `backend/control-hub/src/main/java/io/smartpos/hub/api/ServerController.java` | Server + metrics dashboard endpoints |
| `backend/control-hub/src/main/java/io/smartpos/hub/api/ProxyController.java` | Service control proxy endpoints |
| `backend/control-hub/src/main/java/io/smartpos/hub/api/dto/` | Request/response DTOs |
| `backend/control-hub/src/main/java/io/smartpos/hub/application/AgentService.java` | Agent registry logic |
| `backend/control-hub/src/main/java/io/smartpos/hub/application/MetricsService.java` | Metrics store + query |
| `backend/control-hub/src/main/java/io/smartpos/hub/application/ProxyService.java` | Agent HTTP proxy client |
| `backend/control-hub/src/main/java/io/smartpos/hub/domain/Agent.java` | JPA entity |
| `backend/control-hub/src/main/java/io/smartpos/hub/domain/MetricPoint.java` | TimescaleDB entity |
| `backend/control-hub/src/main/java/io/smartpos/hub/domain/AgentRepository.java` | Spring Data repository |
| `backend/control-hub/src/main/java/io/smartpos/hub/domain/MetricsRepository.java` | Metrics queries |
| `backend/control-hub/src/main/java/io/smartpos/hub/infrastructure/HmacAuthFilter.java` | HMAC validation filter |
| `backend/control-hub/src/main/java/io/smartpos/hub/ws/MetricsWebSocketHandler.java` | WebSocket push |
| `backend/control-hub/src/main/resources/application.yml` | Config |
| `backend/control-hub/src/main/resources/db/migration/V1__create_tables.sql` | Schema |

---

### Task 1: Module scaffolding and build integration

**Files:**
- Create: `backend/control-hub/pom.xml`
- Modify: `backend/pom.xml` (add module)

- [ ] **Step 1: Create control-hub pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>io.smartpos</groupId>
        <artifactId>smartpos-backend</artifactId>
        <version>0.1.0-SNAPSHOT</version>
    </parent>

    <artifactId>control-hub</artifactId>
    <name>Letis Control Hub</name>

    <dependencies>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-websocket</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webflux</artifactId></dependency>
        <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
        <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>
        <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>
        <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: Add control-hub to parent modules**

Edit `backend/pom.xml`, add `<module>control-hub</module>` after the `ai-service` module entry.

- [ ] **Step 3: Verify build resolves**

```bash
cd backend && mvn -q -pl control-hub dependency:resolve
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
cd /Users/ismaelmkumbi/Desktop/LetisPos && git add backend/control-hub/pom.xml backend/pom.xml
git commit -m "feat(hub): add control-hub Maven module"
```

---

### Task 2: Domain entities and database migration

**Files:**
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/domain/Agent.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/domain/MetricPoint.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/domain/AgentRepository.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/domain/MetricsRepository.java`
- Create: `backend/control-hub/src/main/resources/db/migration/V1__create_tables.sql`

- [ ] **Step 1: Write Agent entity**

```java
package io.smartpos.hub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agents")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Agent {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true)
    private String hostname;
    private String ipAddress;
    private String version;
    private Instant firstSeen;
    private Instant lastSeen;
    private String status;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (firstSeen == null) firstSeen = Instant.now();
        if (lastSeen == null) lastSeen = Instant.now();
        if (status == null) status = "online";
    }
}
```

- [ ] **Step 2: Write AgentRepository**

```java
package io.smartpos.hub.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AgentRepository extends JpaRepository<Agent, UUID> {
    Optional<Agent> findByHostname(String hostname);
}
```

- [ ] **Step 3: Write MetricPoint entity**

```java
package io.smartpos.hub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "metric_points")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MetricPoint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Instant time;
    @Column(nullable = false)
    private String serverName;
    private Double cpuPercent;
    private Long memUsedBytes;
    private Long memTotalBytes;
    private Long diskUsedBytes;
    private Long diskTotalBytes;
    private Long netRxBytes;
    private Long netTxBytes;
    private Double load1;
    private Double load5;
    private Double load15;
}
```

- [ ] **Step 4: Write MetricsRepository with time-series queries**

```java
package io.smartpos.hub.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface MetricsRepository extends JpaRepository<MetricPoint, Long> {

    @Query("""
        SELECT m FROM MetricPoint m
        WHERE m.serverName = :server
        AND m.time >= :from AND m.time <= :to
        ORDER BY m.time ASC
    """)
    List<MetricPoint> findByServerAndTimeRange(
        @Param("server") String server,
        @Param("from") Instant from,
        @Param("to") Instant to
    );

    @Query(value = """
        SELECT DISTINCT server_name FROM metric_points
        ORDER BY server_name
    """, nativeQuery = true)
    List<String> findDistinctServerNames();
}
```

- [ ] **Step 5: Write Flyway migration**

```sql
-- V1__create_tables.sql
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    version VARCHAR(20),
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'online'
);

CREATE TABLE IF NOT EXISTS metric_points (
    id BIGSERIAL,
    time TIMESTAMPTZ NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    cpu_percent DOUBLE PRECISION,
    mem_used_bytes BIGINT,
    mem_total_bytes BIGINT,
    disk_used_bytes BIGINT,
    disk_total_bytes BIGINT,
    net_rx_bytes BIGINT,
    net_tx_bytes BIGINT,
    load1 DOUBLE PRECISION,
    load5 DOUBLE PRECISION,
    load15 DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_metric_server_time
    ON metric_points (server_name, time DESC);

-- Convert to hypertable if TimescaleDB is available
DO $$
BEGIN
    PERFORM create_hypertable('metric_points', 'time', if_not_exists => true);
END $$;
```

- [ ] **Step 6: Commit**

```bash
git add backend/control-hub/src/main/java/io/smartpos/hub/domain/ backend/control-hub/src/main/resources/db/
git commit -m "feat(hub): domain entities and Flyway migration"
```

---

### Task 3: Application services

**Files:**
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/application/AgentService.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/application/MetricsService.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/application/ProxyService.java`

- [ ] **Step 1: Write AgentService**

```java
package io.smartpos.hub.application;

import io.smartpos.hub.domain.Agent;
import io.smartpos.hub.domain.AgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentService {
    private final AgentRepository repo;

    @Transactional
    public Agent registerOrUpdate(String hostname, String ipAddress, String version) {
        Agent agent = repo.findByHostname(hostname)
            .map(a -> {
                a.setIpAddress(ipAddress);
                a.setVersion(version);
                a.setLastSeen(Instant.now());
                a.setStatus("online");
                return a;
            })
            .orElseGet(() -> Agent.builder()
                .id(UUID.randomUUID())
                .hostname(hostname)
                .ipAddress(ipAddress)
                .version(version)
                .build());
        return repo.save(agent);
    }

    public List<Agent> findAll() {
        return repo.findAll();
    }

    public Agent findByHostname(String hostname) {
        return repo.findByHostname(hostname)
            .orElseThrow(() -> new RuntimeException("Agent not found: " + hostname));
    }

    @Transactional
    public void markOfflineAfter(Instant threshold) {
        List<Agent> all = repo.findAll();
        for (Agent a : all) {
            if (a.getLastSeen().isBefore(threshold) && "online".equals(a.getStatus())) {
                a.setStatus("offline");
                repo.save(a);
                log.info("Marked agent {} offline (last seen {})", a.getHostname(), a.getLastSeen());
            }
        }
    }
}
```

- [ ] **Step 2: Write MetricsService**

```java
package io.smartpos.hub.application;

import io.smartpos.hub.domain.MetricPoint;
import io.smartpos.hub.domain.MetricsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MetricsService {
    private final MetricsRepository repo;

    @Transactional
    public void store(String serverName, Map<String, Object> metrics) {
        MetricPoint mp = MetricPoint.builder()
            .time(Instant.now())
            .serverName(serverName)
            .cpuPercent(toDouble(metrics.get("cpu_percent")))
            .memUsedBytes(toLong(metrics.get("mem_used_bytes")))
            .memTotalBytes(toLong(metrics.get("mem_total_bytes")))
            .diskUsedBytes(toLong(metrics.get("disk_used_bytes")))
            .diskTotalBytes(toLong(metrics.get("disk_total_bytes")))
            .netRxBytes(toLong(metrics.get("net_rx_bytes")))
            .netTxBytes(toLong(metrics.get("net_tx_bytes")))
            .load1(toDouble(metrics.get("load1")))
            .load5(toDouble(metrics.get("load5")))
            .load15(toDouble(metrics.get("load15")))
            .build();
        repo.save(mp);
    }

    public List<MetricPoint> query(String server, Instant from, Instant to) {
        return repo.findByServerAndTimeRange(server, from, to);
    }

    public List<String> serverNames() {
        return repo.findDistinctServerNames();
    }

    private Double toDouble(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        return null;
    }

    private Long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        return null;
    }
}
```

- [ ] **Step 3: Write ProxyService (WebClient to forward commands to agents)**

```java
package io.smartpos.hub.application;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

@Service
@Slf4j
public class ProxyService {
    private final WebClient client = WebClient.create();

    public String proxyAction(String host, int port, String action) {
        String uri = String.format("http://%s:%d/services/%s", host, port, action);
        try {
            String result = client.post()
                .uri(uri)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            log.info("Proxy {} -> {}: OK", action, uri);
            return result;
        } catch (Exception e) {
            log.error("Proxy {} -> {}: FAILED — {}", action, uri, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Agent unreachable: " + e.getMessage());
        }
    }

    public String proxyLogs(String host, int port, String service, int tail, String filter) {
        String uri = String.format("http://%s:%d/logs/%s?tail=%d", host, port, service, tail);
        if (filter != null && !filter.isEmpty()) uri += "&filter=" + filter;
        try {
            return client.get()
                .uri(uri)
                .retrieve()
                .bodyToMono(String.class)
                .block();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Agent log proxy failed: " + e.getMessage());
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/control-hub/src/main/java/io/smartpos/hub/application/
git commit -m "feat(hub): application services — agent registry, metrics store, proxy"
```

---

### Task 4: HMAC auth filter and security config

**Files:**
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/infrastructure/HmacAuthFilter.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/config/SecurityConfig.java`

- [ ] **Step 1: Write HMAC auth filter**

```java
package io.smartpos.hub.infrastructure;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
@Slf4j
public class HmacAuthFilter extends OncePerRequestFilter {

    @Value("${hub.agent.secret:change-me}")
    private String sharedSecret;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.startsWith("/api/v1/agents");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {
        String ts = request.getHeader("X-LSA-Timestamp");
        String sig = request.getHeader("X-LSA-Signature");

        if (ts == null || sig == null) {
            response.sendError(401, "Missing HMAC headers");
            return;
        }

        // Check timestamp skew (±5 min)
        long now = System.currentTimeMillis() / 1000;
        long reqTime = Long.parseLong(ts);
        if (Math.abs(now - reqTime) > 300) {
            response.sendError(401, "Timestamp skew too large");
            return;
        }

        // Verify signature
        String payload = request.getMethod() + request.getRequestURI() + ts;
        String expected = hmacSha256(payload, sharedSecret);
        if (!expected.equals(sig)) {
            response.sendError(401, "Invalid HMAC signature");
            return;
        }

        chain.doFilter(request, response);
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes()));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }
}
```

Note: `OncePerRequestFilter` needs import from `org.springframework.web.filter.OncePerRequestFilter`.

- [ ] **Step 2: Write SecurityConfig**

```java
package io.smartpos.hub.config;

import io.smartpos.hub.infrastructure.HmacAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final HmacAuthFilter hmacAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/agents/**").permitAll()  // HMAC filtered separately
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            )
            .addFilterBefore(hmacAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // Reuse existing auth-service JWKS
        String jwksUri = System.getenv()
            .getOrDefault("AUTH_JWKS_URI", "http://localhost:8081/.well-known/jwks.json");
        return NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/control-hub/src/main/java/io/smartpos/hub/infrastructure/ backend/control-hub/src/main/java/io/smartpos/hub/config/
git commit -m "feat(hub): HMAC auth filter and JWT security config"
```

---

### Task 5: REST controllers and DTOs

**Files:**
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/api/dto/HeartbeatRequest.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/api/dto/AgentResponse.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/api/AgentController.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/api/ServerController.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/api/ProxyController.java`

- [ ] **Step 1: Write DTOs**

```java
// api/dto/HeartbeatRequest.java
package io.smartpos.hub.api.dto;

import java.util.Map;

public record HeartbeatRequest(
    String server,
    Map<String, Object> metrics,
    String version
) {}
```

```java
// api/dto/AgentResponse.java
package io.smartpos.hub.api.dto;

import java.time.Instant;
import java.util.UUID;

public record AgentResponse(
    UUID id,
    String hostname,
    String ipAddress,
    String version,
    String status,
    Instant lastSeen
) {}
```

- [ ] **Step 2: Write AgentController (HMAC-secured, agent-facing)**

```java
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
```

- [ ] **Step 3: Write ServerController (JWT-secured, dashboard-facing)**

```java
package io.smartpos.hub.api;

import io.smartpos.hub.api.dto.AgentResponse;
import io.smartpos.hub.application.AgentService;
import io.smartpos.hub.application.MetricsService;
import io.smartpos.hub.domain.Agent;
import io.smartpos.hub.domain.MetricPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/servers")
@RequiredArgsConstructor
public class ServerController {

    private final AgentService agentService;
    private final MetricsService metricsService;

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
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        if (from == null) from = Instant.now().minusSeconds(3600);
        if (to == null) to = Instant.now();
        return metricsService.query(name, from, to);
    }
}
```

- [ ] **Step 4: Write ProxyController**

```java
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
        // Use IP if available, else hostname
        return a.getIpAddress() != null ? a.getIpAddress() : a.getHostname();
    }

    @PostMapping("/services/{svc}/restart")
    public ResponseEntity<String> restart(@PathVariable String serverName,
                                           @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), 9100,
            svc + "/restart");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/services/{svc}/stop")
    public ResponseEntity<String> stop(@PathVariable String serverName,
                                        @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), 9100,
            svc + "/stop");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/services/{svc}/start")
    public ResponseEntity<String> start(@PathVariable String serverName,
                                         @PathVariable String svc) {
        Agent a = agentService.findByHostname(serverName);
        String result = proxyService.proxyAction(agentHost(a), 9100,
            svc + "/start");
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
```

- [ ] **Step 5: Commit**

```bash
git add backend/control-hub/src/main/java/io/smartpos/hub/api/
git commit -m "feat(hub): REST controllers — agent heartbeat, server list, proxy"
```

---

### Task 6: WebSocket and application config

**Files:**
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/ws/MetricsWebSocketHandler.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/config/WebSocketConfig.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/HubApplication.java`
- Create: `backend/control-hub/src/main/resources/application.yml`

- [ ] **Step 1: Write WebSocket handler**

```java
package io.smartpos.hub.ws;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
@Slf4j
public class MetricsWebSocketHandler extends TextWebSocketHandler {

    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("WS client connected: {} (total: {})", session.getId(), sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("WS client disconnected: {} (total: {})", session.getId(), sessions.size());
    }

    public void broadcast(String message) {
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    log.warn("WS send failed: {}", e.getMessage());
                }
            }
        }
    }
}
```

- [ ] **Step 2: Write WebSocket config**

```java
package io.smartpos.hub.config;

import io.smartpos.hub.ws.MetricsWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final MetricsWebSocketHandler handler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws")
            .setAllowedOrigins("*");
    }
}
```

- [ ] **Step 3: Write HubApplication**

```java
package io.smartpos.hub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HubApplication {
    public static void main(String[] args) {
        SpringApplication.run(HubApplication.class, args);
    }
}
```

- [ ] **Step 4: Write application.yml**

```yaml
server:
  port: 8100

spring:
  application:
    name: control-hub
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5434/control_hub}
    username: ${DB_USER:smartpos}
    password: ${DB_PASSWORD:smartpos}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false

hub:
  agent:
    secret: ${HUB_AGENT_SECRET:change-me}
```

- [ ] **Step 5: Verify build compiles**

```bash
cd backend && mvn -q -pl control-hub compile
```

Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/control-hub/src/main/java/io/smartpos/hub/ws/ backend/control-hub/src/main/java/io/smartpos/hub/config/ backend/control-hub/src/main/java/io/smartpos/hub/HubApplication.java backend/control-hub/src/main/resources/
git commit -m "feat(hub): WebSocket handler, app config, and entry point"
```

---

### Task 7: Integration and offline detection scheduler

**Files:**
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/application/OfflineDetector.java`
- Create: `backend/control-hub/src/main/java/io/smartpos/hub/config/BroadcastScheduler.java`

- [ ] **Step 1: Write offline detection scheduler**

```java
package io.smartpos.hub.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class OfflineDetector {

    private final AgentService agentService;

    @Scheduled(fixedRate = 15_000)
    public void checkOffline() {
        agentService.markOfflineAfter(Instant.now().minusSeconds(30));
    }
}
```

- [ ] **Step 2: Write metrics broadcast scheduler**

```java
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
```

- [ ] **Step 3: Full build and verify**

```bash
cd backend && mvn -q -pl control-hub compile
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/control-hub/src/main/java/io/smartpos/hub/application/OfflineDetector.java backend/control-hub/src/main/java/io/smartpos/hub/config/BroadcastScheduler.java
git commit -m "feat(hub): offline detection and WebSocket broadcast scheduler"
```
