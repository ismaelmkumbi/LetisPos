# Production Fixes — May 30, 2026

## Architecture

```
Server A (109.199.122.118 / 10.0.0.1)    Server B (161.97.181.166 / 10.0.0.2)
├── gateway              :8080            ├── ai-service          :8091
├── auth                 :8081            ├── report-service      :8087
├── user                 :8082            ├── control-center      :3001
├── frontend             :80              ├── prometheus          :9090
├── nginx                :443             └── monitoring stack
├── control-hub          :8098
└── minio                :9000
```

**Golden rule:** Gateway URIs must use private IPs (`10.0.0.x`), never public IPs. Public ports are firewalled between servers.

---

## Fix 1: Gateway routing — use private IPs

**Problem:** `REPORT_URI` and `AI_URI` pointed to `161.97.181.166:8091/8087` (public IP). Ports not open on public interface → 502/500/timeout.

**Fix:** Changed to private IPs in `/opt/letispos/production/server-a/docker-compose.yml`:
```yaml
REPORT_URI: http://10.0.0.2:8087   # was http://161.97.181.166:8087
AI_URI: http://10.0.0.2:8091       # was http://161.97.181.166:8091
```

---

## Fix 2: Control-hub JVM crash

**Problem:** `JAVA_TOOL_OPTIONS` had continuation lines with `-XX:SoftMaxHeapSize=512M` that exceeded max heap on a 512M container. JVM refused to start → all agents marked offline.

**Error:**
```
SoftMaxHeapSize must be less than or equal to the maximum heap size
```

**Fix:** Removed ZGC continuation lines from control-hub's `JAVA_TOOL_OPTIONS` in docker-compose. Simplified to:
```yaml
JAVA_TOOL_OPTIONS: -XX:+UseContainerSupport -XX:MaxRAMPercentage=50.0 -XX:InitialRAMPercentage=50.0
```

---

## Fix 3: Control-center agent API routing

**Problem:** Control-center at `161.97.181.166` proxies `/api/agent/a/` to `10.0.0.1:9101`. But `10.0.0.1` isn't routable from `161.97.181.166`.

**Fix:** Changed `/opt/letispos/production/nginx/control-center.conf` on server B:
```nginx
location /api/agent/a/ {
    proxy_pass http://109.199.122.118:9101/;  # was http://10.0.0.1:9101/
}
```

Also fixed agent config on server A (`/etc/lsa/config.yaml`):
```yaml
hub_url: "http://10.0.0.1:8098"  # direct to control-hub, bypass gateway JWT
listen_addr: "0.0.0.0:9101"       # was 10.0.0.1:9101
```

---

## Fix 4: Report-service system JWT

**Problem:** `SystemJwtProvider` defaulted to `localhost:8081` for auth. Report-service is on server B — no auth on localhost. All downstream Feign calls to server C failed with 400 "No tenant in context."

**Fix:** Added to report-service in `/opt/letispos/production/server-b/app-services.yml`:
```yaml
SMARTPOS_REPORT_SYSTEM_AUTH_AUTH_URL: http://10.0.0.1:8081/api/v1/auth/login
SMARTPOS_REPORT_SYSTEM_AUTH_TENANT_ID: <tenant-uuid>
```

Also modified `FeignJwtForwarder` to use system tenant ID as fallback when no `TenantContext` exists (scheduled tasks).

---

## Fix 5: Server C YAML syntax

**Problem:** `JAVA_TOOL_OPTIONS` in server-c docker-compose had network flags outside the quoted string:
```yaml
JAVA_TOOL_OPTIONS: "-XX:..." -Dnetworkaddress.cache.ttl=5  # INVALID YAML
```

**Fix:** Wrapped entire value in quotes:
```yaml
JAVA_TOOL_OPTIONS: "-XX:... -Dnetworkaddress.cache.ttl=5"
```

---

## Fix 6: AI email guard + multi-channel notifications

- Added `validateRecipientEmail()` blocking placeholder emails in sendEmail/emailDocument
- Added `notifyCustomer` tool — sends via ALL channels (email+SMS+WhatsApp) automatically
- Added `sendWhatsApp` tool
- New `POST /api/v1/notifications/multi` endpoint for parallel dispatch

---

## Fix 7: Registration — no verification method choice

- Removed "Verification method" toggle from registration form
- User always enters email + optional phone
- Backend sends verification to both channels automatically
- User is ACTIVE immediately after registration

---

## Fix 8: JDBC URL quoting

**Problem:** Unquoted `jdbc:postgresql://` URLs in docker-compose caused YAML parse errors in CI.

**Fix:** Quoted all DB_URL values across all compose files.

---

## Key config files

| File | Server | Purpose |
|------|--------|---------|
| `/opt/letispos/production/server-a/docker-compose.yml` | A | Gateway, auth, user, frontend |
| `/opt/letispos/production/server-b/app-services.yml` | B | AI, report, document, audit, notification |
| `/opt/letispos/production/server-c/docker-compose.yml` | C | Sales, inventory, products, payments |
| `/etc/lsa/config.yaml` | A | Agent heartbeat config |
| `/opt/letispos/production/nginx/control-center.conf` | B | Control center nginx |
| `/etc/letispos/nginx/nginx.conf` | A | Main nginx |

## Quick health check

```bash
# Server A
curl http://10.0.0.1:8080/actuator/health  # gateway
curl http://10.0.0.1:8081/actuator/health  # auth
curl http://10.0.0.1:8098/actuator/health  # control-hub
curl http://10.0.0.1:9101/health           # agent

# Server B
curl http://10.0.0.2:8091/actuator/health  # ai-service
curl http://10.0.0.2:8087/actuator/health  # report-service
curl http://10.0.0.2:9101/health           # agent
```
