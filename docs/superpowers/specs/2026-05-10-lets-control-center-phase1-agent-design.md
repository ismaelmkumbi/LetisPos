# Letis Control Center — Phase 1: Server Agent

## Summary

A lightweight Go daemon (`lsa`) deployed on every Ubuntu server that collects system metrics, manages services (systemd + Docker), streams logs, and reports to the Control Hub via REST. Eliminates the need to SSH into servers for daily operations.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Control Hub (Phase 2)             │
│                   REST + WebSocket                 │
└──────────────┬──────────┬──────────┬──────────────┘
               │ HMAC     │          │
          ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
          │  Agent  │ │ Agent  │ │ Agent  │
          │ :9100   │ │ :9100  │ │ :9100  │
          └───┬─────┘ └───┬────┘ └───┬────┘
              │           │          │
         ┌────▼───┐  ┌───▼───┐  ┌──▼──────┐
         │ systemd│  │Docker │  │/proc +  │
         │ services│ │contain│  │journald │
         └────────┘  └──────┘  └─────────┘
```

## Requirements

### System metrics collection
- CPU usage (per-core and aggregate)
- Memory (used, available, total, swap)
- Disk I/O and usage per mount point
- Network throughput per interface
- Load average and uptime
- Collect via `/proc` and `syscall` — no external dependencies

### Service management
- List all systemd services with status (active/inactive/failed)
- Start, stop, restart any systemd service
- List Docker containers with status
- Start, stop, restart Docker containers
- Filter by name or label

### Log streaming
- Tail systemd journald logs per service
- Tail Docker container logs
- Support pagination (`?tail=100`), time range (`?since=10m`), and text filter (`?filter=ERROR`)
- Stream as plain text or JSON lines

### Heartbeat reporting
- Push metrics snapshot to Control Hub every 5 seconds via REST
- Include agent version, server hostname, and health status
- Back off exponentially on connection failure

### Self-update
- Check Hub for new binary version
- Download, verify SHA256 checksum
- Replace binary and restart gracefully (drain connections first)

### Security
- All Hub-bound requests signed with HMAC-SHA256 using a shared secret
- Agent listens on `127.0.0.1:9100` by default, configurable to internal network interface
- No authentication on local endpoints (firewalled from public access)
- Audit log of all management actions (restart, stop, etc.)

## API Endpoints

All endpoints served on port 9100:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Agent health + uptime |
| GET | `/metrics` | Full system metrics snapshot |
| GET | `/services` | List all systemd services |
| POST | `/services/:name/restart` | Restart a systemd service |
| POST | `/services/:name/stop` | Stop a systemd service |
| POST | `/services/:name/start` | Start a systemd service |
| GET | `/logs/:service` | Stream logs with query params |
| GET | `/containers` | List all Docker containers |
| POST | `/containers/:id/restart` | Restart a container |

## Install

```bash
curl -fsSL https://control.letispos.com/install.sh | bash
```

Installs `/usr/local/bin/lsa`, creates `/etc/systemd/system/lsa.service`, enables and starts.

## Directory structure

```
ops/agent/
├── main.go              # CLI flags, startup, graceful shutdown
├── collector/
│   ├── cpu.go
│   ├── memory.go
│   ├── disk.go
│   └── network.go
├── manager/
│   ├── systemd.go        # D-Bus systemd interface
│   └── docker.go         # Docker socket client
├── logs/
│   └── streamer.go       # Journald + Docker log tailing
├── api/
│   └── server.go         # HTTP server, middleware, routes
├── reporter/
│   └── heartbeat.go      # Periodic push to Hub
├── auth/
│   └── hmac.go           # Request signing
└── updater/
    └── self_update.go    # Binary update mechanism
```

## Config

```yaml
# /etc/lsa/config.yaml
hub_url: "https://control.letispos.com"
hub_secret: "${LSA_HUB_SECRET}"
listen_addr: "127.0.0.1:9100"
server_name: "prod-web-01"
metrics_interval: 5s
log_max_lines: 1000
```

## Tech stack

| Component | Choice |
|-----------|--------|
| Language | Go 1.24+ |
| HTTP server | `net/http` (stdlib) |
| systemd | `github.com/coreos/go-systemd/v22` |
| Docker | `github.com/docker/docker/client` |
| Metrics | `/proc` + `gopsutil` |
| Config | `github.com/spf13/viper` |
| Build | `go build -ldflags="-s -w"` → ~10 MB binary |
