# Letis Control Center — Phase 2: Control Hub

## Summary

A Spring Boot service (`control-hub`) that serves as the central API for the Letis Control Center. Agents push metrics to it via HMAC-signed REST calls. The dashboard queries it for real-time server status, metrics history, and service control. WebSocket pushes live updates.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Web Dashboard (Phase 3)                  │
│                    JWT + WebSocket                       │
└─────────────────────┬───────────────────────────────────┘
                      │ REST + WS
┌─────────────────────▼───────────────────────────────────┐
│                 Control Hub (Phase 2)                    │
│            Spring Boot :8100 · TimescaleDB               │
│   ┌──────────┬──────────┬──────────┬──────────────────┐ │
│   │ Agent    │ Metrics  │ Proxy    │ WebSocket        │ │
│   │ Registry │ Store    │ Service  │ Push             │ │
│   └──────────┴──────────┴──────────┴──────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ HMAC
          ┌───────────┼───────────┐
     ┌────▼───┐  ┌───▼────┐  ┌───▼────┐
     │ Agent  │  │ Agent  │  │ Agent  │
     │ :9100  │  │ :9100  │  │ :9100  │
     └────────┘  └────────┘  └────────┘
```

## Requirements

### Agent ingestion
- HMAC-signed heartbeat endpoint
- Validate signature, timestamp (±5 min window)
- Register new agents on first heartbeat
- Update last-seen timestamp
- Store metrics in TimescaleDB hypertable

### Agent registry
- Track all known agents (hostname, IP, version, last seen)
- Mark agents offline after 30s without heartbeat
- Return agent list with status for dashboard

### Metrics storage and query
- TimescaleDB hypertable for efficient time-series storage
- Auto-partition by day
- Query: GET /metrics with from, to, interval parameters
- Downsample to requested interval (1m, 5m, 1h, 1d)

### Service control proxy
- Dashboard issues restart/stop/start → Hub forwards to agent
- HTTP client to POST to agent's :9100 endpoints
- Return agent's response to dashboard
- Audit log every action

### Real-time WebSocket
- Single WS endpoint for dashboard
- Push server status changes and latest metrics every 5s
- Subscribe/unsubscribe to specific servers (reduce bandwidth)

### Security
- Agent endpoints: HMAC-SHA256 signature validation
- Dashboard endpoints: JWT Bearer token (existing auth-service)
- Role-based: ADMIN (full control), OPERATOR (view + restart), VIEWER (read-only)
- All service-control actions audited

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/agents/heartbeat` | HMAC | Agent push metrics |
| GET | `/api/v1/servers` | JWT | List all servers |
| GET | `/api/v1/servers/{name}` | JWT | Server detail + latest metrics |
| GET | `/api/v1/servers/{name}/metrics` | JWT | Time-series metrics query |
| POST | `/api/v1/servers/{name}/services/{svc}/restart` | JWT | Proxy restart to agent |
| POST | `/api/v1/servers/{name}/services/{svc}/stop` | JWT | Proxy stop to agent |
| POST | `/api/v1/servers/{name}/services/{svc}/start` | JWT | Proxy start to agent |
| GET | `/api/v1/servers/{name}/logs/{svc}` | JWT | Proxy logs from agent |
| WS | `/ws` | JWT | Real-time metrics stream |

## Database

TimescaleDB extension on existing PostgreSQL:

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  hostname VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  version VARCHAR(20),
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(20) DEFAULT 'online'
);

CREATE TABLE metric_points (
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

SELECT create_hypertable('metric_points', 'time');
CREATE INDEX idx_metric_server_time ON metric_points (server_name, time DESC);
```

## Directory structure

```
backend/control-hub/
├── pom.xml
├── src/main/java/io/smartpos/hub/
│   ├── HubApplication.java
│   ├── config/SecurityConfig.java
│   ├── config/WebSocketConfig.java
│   ├── agent/
│   │   ├── AgentController.java
│   │   ├── AgentService.java
│   │   ├── AgentRepository.java
│   │   └── Agent.java
│   ├── metrics/
│   │   ├── MetricsController.java
│   │   ├── MetricsService.java
│   │   ├── MetricsRepository.java
│   │   └── MetricPoint.java
│   ├── proxy/
│   │   └── AgentProxyService.java
│   ├── ws/
│   │   └── MetricsWebSocketHandler.java
│   └── auth/
│       └── HmacAuthFilter.java
└── src/main/resources/
    ├── application.yml
    └── db/migration/
        └── V1__create_tables.sql
```

## Tech stack

| Component | Choice |
|-----------|--------|
| Framework | Spring Boot 3.4 |
| Database | PostgreSQL 16 + TimescaleDB |
| Time-series | TimescaleDB hypertables |
| WebSocket | Spring WebSocket |
| HTTP client | WebClient (Spring WebFlux) |
| Auth (agent) | Custom HMAC-SHA256 filter |
| Auth (dashboard) | JWT via existing auth-service |
| Migrations | Flyway |
