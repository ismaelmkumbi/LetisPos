#!/bin/bash
# Post-deploy smoke test — validates auth + gateway + full login flow.
# Exits 0 on success, 1 on failure. Designed for CI/CD deploy step.
#
# Required env vars (set via GitHub Secrets or CI config):
#   SMOKE_TEST_URL  — base URL (default: http://localhost:8080)
#   SMOKE_EMAIL     — login email (skip login test if unset)
#   SMOKE_PASSWORD  — login password (skip login test if unset)
set -euo pipefail

BASE="${SMOKE_TEST_URL:-http://localhost:8080}"
PASS=0
FAIL=0

red()  { echo -e "\033[31mFAIL\033[0m $*"; }
green(){ echo -e "\033[32mPASS\033[0m $*"; }

# Poll health endpoint until it responds (services take time to boot)
wait_for_health() {
    local label="$1" url="$2" timeout="${3:-60}"
    local started=$SECONDS
    echo -n "Waiting for $label "
    while true; do
        local http
        http=$(curl -s -o /dev/null -w "%{http_code}" -m5 "$url" 2>/dev/null || echo "000")
        if [[ "$http" == "200" || "$http" == "401" || "$http" == "403" ]]; then
            echo " — OK ($http after $((SECONDS - started))s)"
            return 0
        fi
        if [[ $((SECONDS - started)) -ge $timeout ]]; then
            echo " — TIMEOUT (last status: $http)"
            return 1
        fi
        sleep 2
        echo -n "."
    done
}

check() {
    local label="$1" url="$2" expected="${3:-200}"
    local http
    http=$(curl -s -o /dev/null -w "%{http_code}" -m10 "$url" 2>/dev/null || echo "000")
    if [[ "$http" == "$expected" ]]; then
        green "$label"
        ((PASS++)) || true
    else
        red "$label — expected $expected, got $http"
        ((FAIL++)) || true
    fi
}

echo "=== Smoke Tests — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "Base URL: $BASE"
echo ""

# 1. Wait for services to be ready (services take ~30s to boot)
if ! wait_for_health "auth-service" "http://localhost:8081/actuator/health"; then
    red "Auth health          — failed to start"
    ((FAIL++)) || true
else
    green "Auth health         "
    ((PASS++)) || true
fi

if ! wait_for_health "gateway" "$BASE/actuator/health" 90; then
    red "Gateway health       — failed to start"
    ((FAIL++)) || true
else
    green "Gateway health      "
    ((PASS++)) || true
fi

# 3-4. Login + protected endpoint (only if credentials configured)
if [[ -n "${SMOKE_EMAIL:-}" && -n "${SMOKE_PASSWORD:-}" ]]; then
    echo ""
    echo "--- Auth flow ---"

    local TOKEN
    TOKEN=$(curl -sf -m10 -X POST "$BASE/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}" \
        2>/dev/null | jq -r '.accessToken // empty')

    if [[ -z "$TOKEN" ]]; then
        red "Login               — no token returned"
        ((FAIL++)) || true
    else
        green "Login               "

        HTTP=$(curl -s -o /dev/null -w "%{http_code}" -m10 \
            "$BASE/api/v1/auth/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
        if [[ "$HTTP" == "200" ]]; then
            green "Protected endpoint  "
            ((PASS++)) || true
        else
            red "Protected endpoint  — /me returned $HTTP"
            ((FAIL++)) || true
        fi
    fi
else
    echo ""
    echo "SKIP: Login test — SMOKE_EMAIL + SMOKE_PASSWORD not set"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    echo "SMOKE TEST FAILED — deploy aborted"
    exit 1
fi
echo "All smoke tests passed"
