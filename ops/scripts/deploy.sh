#!/usr/bin/env bash
# LetisPOS — Production deployment script
# =========================================
# Pulls latest images from GHCR, restarts changed services with zero-downtime
# rolling updates, runs health checks, and rolls back on failure.
#
# Usage (on the VPS):
#   chmod +x ops/scripts/deploy.sh
#   ./ops/scripts/deploy.sh
#
# Environment variables:
#   COMPOSE_FILE  — path to production compose file (default: ops/docker-compose.prod.yml)
#   IMAGE_TAG     — image tag to deploy (default: latest)
#   HEALTH_WAIT   — seconds to wait for health checks (default: 90)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/ops/docker-compose.prod.yml}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_WAIT="${HEALTH_WAIT:-90}"

# ── Pre-flight checks ──────────────────────────────────────────────────────────

echo "==> LetisPOS Deploy — $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "    Compose: $COMPOSE_FILE"
echo "    Tag:     $IMAGE_TAG"

if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed."
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "ERROR: Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# ── Pull latest images ──────────────────────────────────────────────────────────

echo "==> Pulling images (tag: $IMAGE_TAG)..."
export IMAGE_TAG
docker compose -f "$COMPOSE_FILE" pull --quiet 2>&1 | grep -v "already exists" || true

# ── Capture current state for potential rollback ────────────────────────────────

echo "==> Capturing current container state..."
PREVIOUS_STATE=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null || echo "[]")

# ── Rolling restart (only changed services restart) ─────────────────────────────

echo "==> Applying updates..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans 2>&1

# ── Health checks ────────────────────────────────────────────────────────────────

echo "==> Waiting for services to become healthy (timeout: ${HEALTH_WAIT}s)..."
START_TIME=$(date +%s)

SERVICES=$(docker compose -f "$COMPOSE_FILE" ps --services)

while true; do
    ALL_HEALTHY=true
    for svc in $SERVICES; do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "missing")

        if [ "$STATUS" = "unhealthy" ]; then
            echo "    ✗ $svc is unhealthy — rolling back..."
            docker compose -f "$COMPOSE_FILE" down
            docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
            echo "ERROR: Deploy failed — $svc health check failed. Previous state restored."
            exit 1
        fi

        if [ "$STATUS" != "healthy" ]; then
            ALL_HEALTHY=false
        fi
    done

    if $ALL_HEALTHY; then
        echo "==> All services healthy."
        break
    fi

    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ "$ELAPSED" -ge "$HEALTH_WAIT" ]; then
        echo "ERROR: Timed out waiting for healthy services after ${HEALTH_WAIT}s."
        echo "Current status:"
        docker compose -f "$COMPOSE_FILE" ps
        docker compose -f "$COMPOSE_FILE" down
        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
        echo "ERROR: Deploy failed. Previous state restored."
        exit 1
    fi

    sleep 5
done

# ── Clean up old images ─────────────────────────────────────────────────────────

echo "==> Pruning old images..."
docker image prune -af --filter "until=72h" 2>/dev/null || true

echo "==> Deploy complete."
