# Production Hardening — Auth, Deploy, Smoke Tests

## Problem
1. Auth restart changes JWT signing key → gateway has stale JWKS → all API calls 401 until gateway also restarts. No smoke test catches this.
2. Root SSH deploys are fragile — no health validation, no deploy user, secrets can leak.

## Solution — 4 Deliverables

### 1. Systemd Environment for Auth
- `ops/systemd/letispos-auth.service.d/env.conf` — drop-in with JWT key paths
- `ops/scripts/setup-jwt-keys.sh` — generates RSA keys if missing, sets 600 permissions
- Auth service fails fast on startup if key files missing and ephemeral keys disabled

### 2. Deploy Smoke Test
- `ops/scripts/smoke-test.sh` — runs after backend restart:
  1. Auth health check (port 8081)
  2. Gateway health check (port 8080)
  3. Login with SMOKE_EMAIL / SMOKE_PASSWORD (from GitHub Secrets)
  4. Call protected `/api/v1/auth/me` through gateway
  5. Exit 1 on any failure → deploy fails
- Integrated into CI deploy step

### 3. Deploy User Docs
- `ops/docs/DEPLOY_USER.md` — create `deploy` user, passwordless sudo for systemctl, SSH key setup, JWT directory permissions

### 4. Secrets Protection
- `.gitignore`: `*.pem`, `*.key`, smoke test script with embedded creds pattern
- Smoke credentials via GitHub Secrets only

## Files
| File | Action |
|------|--------|
| `ops/systemd/letispos-auth.service.d/env.conf` | Create |
| `ops/scripts/setup-jwt-keys.sh` | Create |
| `ops/scripts/smoke-test.sh` | Create |
| `ops/docs/DEPLOY_USER.md` | Create |
| `.gitignore` | Modify |
| `.github/workflows/ci.yml` | Modify — add smoke test step |
