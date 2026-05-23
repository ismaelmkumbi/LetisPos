# LetisPOS Production Service Placement Plan

Date: 2026-05-23

## Current Server Specs

| Server | Role today | CPU | RAM | Disk | Current load | Assessment |
|---|---:|---:|---:|---|---:|---|
| Server A `109.199.122.118` / `10.0.0.1` | Edge + most app services | 6 vCPU | 11 GiB | 200 GB SSD-class, non-rotational | 3.78 / 5.85 / 7.13 | Overloaded by too many JVM services |
| Server B `161.97.181.166` / `10.0.0.2` | Monitoring + standby | 4 vCPU | 7.8 GiB | 150 GB SSD-class, non-rotational | 0.05 / 0.10 / 0.14 | Very underused |
| Server C `62.169.28.46` / `10.0.0.3` | Data + transaction services | 6 vCPU | 11 GiB | 100 GB NVMe plan, non-rotational | 0.59 / 0.45 / 0.54 | Healthy, best place for DB-heavy services |

`lsblk` reports all root disks as non-rotational because these are virtualized block devices. The VPS product class still matters: Server C is the NVMe plan and should remain the primary data/hot transaction server.

## Problem

Server A currently runs the edge layer plus most Java services:

- `nginx`, `frontend`, `gateway`, `gateway-backup`
- `auth`, `user`, `report`, `audit`, `hrm`, `commerce`, `control-hub`
- `notification`, `crm`, `billing`, `integration`, `document`, `ai`
- `gotenberg`, `minio`, `node-exporter`

This makes login and dashboard latency unstable because login-critical services compete with AI, document rendering, reports, CRM, audit, billing, and other JVMs on the same server.

## Target Layout

### Server A: Edge + Login-Critical Services

Keep Server A focused on the request path users feel immediately.

| Service | Target memory limit | Reason |
|---|---:|---|
| `nginx` | 128M | SSL, routing |
| `frontend` | 64M | Static SPA |
| `gateway` | 768M | Main API entrypoint; current 384M is tight |
| `auth-service` | 768M | Login, JWT, refresh |
| `user-service` | 768M | Roles/menu/profile; auth depends on it during login |
| `minio` | 512M | Existing file proxy points here |
| `control-hub` | 512M | Operational control plane |
| `node-exporter` | no hard limit needed | Host metrics |

Recommended hard-limit total: about 3.5 GiB excluding exporter. This leaves enough RAM and CPU headroom for JVM spikes and deploys.

### Server B: Background + Admin + Compute Services

Use the underused SSD server for services that should not slow login.

| Service | Target memory limit | Reason |
|---|---:|---|
| `report-service` | 896M | Reporting can spike CPU/memory |
| `ai-service` | 768M | External AI calls and parsing should not compete with login |
| `document-service` | 768M | PDF/template generation |
| `gotenberg` | 512M | Keep beside document-service |
| `audit-service` | 512M | Background/admin workload |
| `billing-service` | 512M | Admin/payment lifecycle workload |
| `crm-service` | 640M | Admin/business workflow |
| `integration-service` | 512M | Webhooks/integrations |
| `hrm-service` | 512M | Business workflow, not login-critical |
| `notification-service` | 512M | Email/SMS/WhatsApp async work |
| `prometheus` | 512M | Existing monitoring |
| `alertmanager` | 128M | Existing monitoring |
| `control-center` | 64M | Existing UI |
| `postgres-replica` | 768M | Keep standby replica |
| `backup` | 128M | Existing backup job |

Recommended hard-limit total is higher than physical RAM if every service peaks at once, but expected steady state should be around 4-5 GiB. If this server begins swapping, move `hrm-service` or `integration-service` back to Server A after the main login pressure is fixed.

### Server C: NVMe Data + Hot Transaction Services

Keep database, cache, message broker, and high-write business services on the NVMe server.

| Service | Target memory limit | Reason |
|---|---:|---|
| `postgres` | 3G | Primary data store; NVMe helps here most |
| `redis` | 512M | Cache/rate limit/session support |
| `kafka` | 1536M | Current 1G is at about 90% |
| `product-service` | 768M | Hot catalog reads/writes |
| `inventory-service` | 768M | Stock operations |
| `sales-service` | 896M | POS/sales hot path |
| `payment-service` | 768M | Payment/accounting hot path |
| `commerce-service` | 768M | Storefront and commerce calls product/sales/payment often |
| `node-exporter` | no hard limit needed | Host metrics |

Recommended hard-limit total: about 9 GiB. This fits the 11 GiB machine while keeping data locality strong.

## Migration Order

1. Deploy the auth login cache and frontend same-origin API fix first.
2. Increase memory limits for `gateway`, `auth-service`, `user-service`, and `kafka`.
3. Move `document-service` and `gotenberg` from Server A to Server B.
4. Move `report-service` and `ai-service` from Server A to Server B.
5. Move `audit`, `billing`, `crm`, `integration`, `hrm`, and `notification` from Server A to Server B.
6. Move `commerce-service` from Server A to Server C.
7. Update gateway route environment variables to point to the new private IPs.
8. Run smoke tests for login, `/auth/me`, dashboard, product, POS, payment, document generation, and reports.

## Expected Result

Login should become stable because Server A will only run edge/login-critical services. Report generation, AI, document rendering, CRM, billing, audit, and notification spikes will no longer compete with `gateway`, `auth-service`, and `user-service`.

The best long-term shape is:

- Server A: fast edge and login.
- Server B: background/admin/compute.
- Server C NVMe: database, cache, broker, and transaction-heavy services.

## Execution Status

Applied on 2026-05-23:

- Server A reduced to `nginx`, `frontend`, `gateway`, `gateway-backup`, `auth-service`, `user-service`, `control-hub`, `minio`, and `node-exporter`.
- Server B now runs `report-service`, `ai-service`, `document-service`, `gotenberg`, `audit-service`, `billing-service`, `crm-service`, `integration-service`, `hrm-service`, and `notification-service`.
- Server C now runs `commerce-service` alongside `postgres`, `redis`, `kafka`, `product-service`, `inventory-service`, `sales-service`, and `payment-service`.
- Gateway routes now point background/admin services to Server B private IP `10.0.0.2` and commerce to Server C private IP `10.0.0.3`.
- Server C memory limits were increased live for Postgres, Redis, Kafka, product, inventory, sales, payment, and commerce.

Post-change smoke:

- Server A load dropped to `1.39 / 3.16 / 4.60`.
- Invalid login timings through HTTPS were `0.149s`, `0.057s`, and `0.116s`.
- Gateway routes to billing, report, document, AI, commerce/storefront, and product responded.
- Server B moved services were healthy.
- Server C commerce and hot transaction services were healthy.

Known follow-up:

- `letispos-control-center` on Server B is still marked unhealthy, but this was already present before the service move and is separate from login/API performance.

## Login CORS Finding

After the service move, browser login could still show `Unable to sign in. Please try again` even when the server-side login request returned HTTP 200. The deployed frontend bundle was still built with `https://api.letispos.com` as its API base URL, so login was cross-origin from `https://letispos.com` to `https://api.letispos.com`.

The gateway/auth response for cross-origin login included duplicate CORS headers:

- `access-control-allow-origin`
- `access-control-allow-credentials`

Browsers can reject that response even when the backend request itself succeeds. Nginx logs showed real browser `POST /api/v1/auth/login` requests returning HTTP 200, which confirmed the visible login failure was a browser-side response blocking issue, not only an authentication or latency issue.

Applied hotfix on 2026-05-23:

- Patched the live frontend bundle in `letispos-frontend` to use `location.origin` instead of `https://api.letispos.com`.
- Updated the served HTML to load `assets/index-BJ7Scg6N-corsfix.js`, a new asset URL, so browsers do not keep using the old cached JS file.
- Verified `https://letispos.com/` now references `assets/index-BJ7Scg6N-corsfix.js`.
- Verified the public JS contains `location.origin` and no longer contains `https://api.letispos.com`.
- Verified same-origin login endpoint `https://letispos.com/api/v1/auth/login` returns a normal backend response.

Durable follow-up:

- ~~Rebuild and redeploy the frontend image from the repository source so the same-origin API base is inside the image, not only hot-patched in the running container.~~ **DONE 2026-05-23 10:33 UTC**: Removed `VITE_API_BASE_URL=https://api.letispos.com` from `.env.production`. The source already had `autoApiBaseUrl()` as fallback which returns `window.location.origin` at runtime. Rebuilt frontend, deployed clean bundle (`index-C-C09pWi.js`) to server A, verified 0 references to `api.letispos.com`. Login, refresh, and all API calls now use same-origin `https://letispos.com`.
- Clean up duplicate CORS header generation in the gateway/auth path so `https://api.letispos.com` also works correctly for any future external API clients.

### Root cause of `"Something went wrong"` errors (2026-05-23 ~10:00 UTC)

The hot-patched bundle (`index-BJ7Scg6N-corsfix.js`) corrupted the minified JS. The sed-style string replacement of `https://api.letispos.com` → `location.origin` happened inside a string literal, so `API_BASE_URL` became the literal string `"location.origin"` instead of evaluating `window.location.origin` as JavaScript. This caused:

- `POST /auth/location.origin/api/v1/auth/refresh` — broken refresh URL resolved relative to `/auth/login`
- `useAuth must be used within SmartPosAuthProvider` — Provider tree instability from rendering failures
- `You cannot render a <Router> inside another <Router>` — React tree corruption
- `Failed to execute removeChild` — DOM reconciliation failures from the cascading errors
