#!/usr/bin/env bash
# LetisPOS — Migrate production from systemd JAR services → Docker Compose
# =========================================================================
# Run this ONCE on the VPS to hand control over to docker-compose.prod.yml.
#
# Pre-requisites:
#   1. /var/www/LetisPos/.env exists with real credentials (copy from ops/.env.prod.example)
#   2. Docker + Docker Compose v2 installed  (docker compose version)
#   3. GHCR images already pushed by CI (or run: IMAGE_TAG=latest docker compose pull)
#   4. Postgres data is in /var/lib/docker/volumes/smartpos-postgres-data
#      OR the existing host Postgres is migrated.
#
# Usage:
#   cd /var/www/LetisPos
#   sudo bash ops/scripts/migrate-to-compose.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/ops/docker-compose.prod.yml"

echo "==> LetisPOS: migrate systemd → Docker Compose"
echo "    Project: $PROJECT_ROOT"
echo "    Compose: $COMPOSE_FILE"
echo ""

# ── 1. Stop & disable all systemd letispos-* units ────────────────────────────
echo "==> Stopping systemd services..."
UNITS=$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null \
        | grep "letispos-" | awk '{print $1}' || true)

if [ -n "$UNITS" ]; then
    for unit in $UNITS; do
        echo "    Stopping $unit"
        systemctl stop "$unit" || true
    done
    echo "    Disabling all letispos-* units..."
    systemctl disable letispos-* 2>/dev/null || true
else
    echo "    No running letispos-* systemd units found."
fi

# ── 2. Stop any conflicting host-level redis/kafka ────────────────────────────
echo "==> Ensuring host redis-server is stopped (Docker redis takes over)..."
systemctl stop redis-server 2>/dev/null && systemctl disable redis-server 2>/dev/null || true

# ── 3. Verify .env exists ──────────────────────────────────────────────────────
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "ERROR: $PROJECT_ROOT/.env not found."
    echo "       Copy ops/.env.prod.example to .env and fill in real values."
    exit 1
fi
echo "==> .env file found."

# ── 4. Pull images ─────────────────────────────────────────────────────────────
echo "==> Pulling images from GHCR..."
docker compose -f "$COMPOSE_FILE" pull

# ── 5. Start all services ──────────────────────────────────────────────────────
echo "==> Starting all services via Docker Compose..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── 6. Wait for gateway health ─────────────────────────────────────────────────
echo "==> Waiting for gateway to become healthy..."
for i in $(seq 1 30); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' smartpos-gateway 2>/dev/null || echo "starting")
    if [ "$STATUS" = "healthy" ]; then
        echo "    Gateway healthy."
        break
    fi
    echo "    [$i/30] $STATUS — waiting 5s..."
    sleep 5
done

# ── 7. Update nginx to proxy to Docker frontend container ─────────────────────
echo "==> Updating host nginx to proxy frontend from 127.0.0.1:3000..."
NGINX_CONF="/etc/nginx/sites-available/letispos"
if [ -f "$NGINX_CONF" ]; then
    # Replace any proxy_pass pointing at /var/www/letispos static files
    # with a reverse proxy to the Docker frontend container on 127.0.0.1:3000
    cat > "$NGINX_CONF" << 'NGINX'
server {
    listen 80;
    server_name letispos.com www.letispos.com api.letispos.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name letispos.com www.letispos.com;

    ssl_certificate     /etc/letsencrypt/live/letispos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/letispos.com/privkey.pem;

    # Frontend SPA (Docker container on 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.letispos.com;

    ssl_certificate     /etc/letsencrypt/live/letispos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/letispos.com/privkey.pem;

    # API Gateway (Docker container on 8080)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
NGINX
    nginx -t && systemctl reload nginx
    echo "    nginx updated and reloaded."
else
    echo "    WARN: $NGINX_CONF not found — update nginx manually."
fi

echo ""
echo "==> Migration complete."
echo "    Check status:  docker compose -f ops/docker-compose.prod.yml ps"
echo "    View logs:     docker compose -f ops/docker-compose.prod.yml logs -f --tail=50"
echo ""
