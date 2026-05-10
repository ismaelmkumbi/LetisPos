#!/usr/bin/env bash
# LetisPOS — Dev Service Dashboard
# Shows which services are up/down and lets you restart any of them.
# Usage: ./ops/tools/dev-dashboard.sh          (status view)
#        ./ops/tools/dev-dashboard.sh restart <service>  (restart a service)

set -e
cd "$(dirname "$0")/../.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

declare -A SERVICES
SERVICES=(
  ["gateway"]="8080|mvn -q spring-boot:run -pl gateway"
  ["auth-service"]="8081|mvn -q spring-boot:run -pl auth-service"
  ["user-service"]="8082|mvn -q spring-boot:run -pl user-service"
  ["product-service"]="8083|mvn -q spring-boot:run -pl product-service"
  ["inventory-service"]="8084|mvn -q spring-boot:run -pl inventory-service"
  ["sales-service"]="8085|mvn -q spring-boot:run -pl sales-service"
  ["payment-service"]="8086|mvn -q spring-boot:run -pl payment-service"
  ["report-service"]="8087|mvn -q spring-boot:run -pl report-service"
  ["notification-service"]="8089|mvn -q spring-boot:run -pl notification-service"
  ["hrm-service"]="8090|mvn -q spring-boot:run -pl hrm-service"
  ["ai-service"]="8091|mvn -q spring-boot:run -pl ai-service"
  ["integration-service"]="8092|mvn -q spring-boot:run -pl integration-service"
)

INFRA=(
  ["PostgreSQL"]="5434"
  ["Redis"]="6379"
  ["MinIO"]="9001"
  ["MailHog"]="8025"
)

check_port() {
  lsof -i ":$1" -sTCP:LISTEN &>/dev/null && echo "UP" || echo "DOWN"
}

status() {
  echo ""
  printf "  %-22s %-6s  %s\n" "SERVICE" "PORT" "STATUS"
  printf "  %-22s %-6s  %s\n" "───────" "────" "──────"

  # Infra
  echo -e "  ${CYAN}── Infrastructure ──${NC}"
  for name in "${!INFRA[@]}"; do
    port="${INFRA[$name]}"
    state=$(check_port "$port")
    color=$([ "$state" = "UP" ] && echo "$GREEN" || echo "$RED")
    printf "  %-22s %-6s  ${color}%-6s${NC}\n" "$name" "$port" "$state"
  done

  echo ""
  echo -e "  ${CYAN}── Backend Services ──${NC}"
  for name in "${!SERVICES[@]}"; do
    entry="${SERVICES[$name]}"
    port="${entry%%|*}"
    state=$(check_port "$port")
    color=$([ "$state" = "UP" ] && echo "$GREEN" || echo "$RED")
    printf "  %-22s %-6s  ${color}%-6s${NC}\n" "$name" "$port" "$state"
  done

  echo ""
  echo -e "  ${CYAN}── Frontend ──${NC}"
  fp=$(check_port "5173")
  fc=$([ "$fp" = "UP" ] && echo "$GREEN" || echo "$RED")
  printf "  %-22s %-6s  ${fc}%-6s${NC}\n" "frontend (vite)" "5173" "$fp"
  echo ""
}

restart_service() {
  local name="$1"
  local entry="${SERVICES[$name]}"
  if [ -z "$entry" ]; then
    echo "Unknown service: $name"
    echo "Available: ${!SERVICES[*]}"
    exit 1
  fi
  local port="${entry%%|*}"
  local cmd="${entry#*|}"

  echo "Stopping $name on port $port..."
  lsof -ti ":$port" | xargs kill 2>/dev/null || true
  sleep 1

  echo "Starting $name..."
  cd backend
  $cmd > /tmp/letispos-$name.log 2>&1 &
  cd ..
  sleep 3

  if check_port "$port" = "UP"; then
    echo -e "${GREEN}$name started OK on port $port${NC}"
  else
    echo -e "${RED}$name failed to start — check /tmp/letispos-$name.log${NC}"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────

case "${1:-status}" in
  status)
    # Auto-refresh every 3s if no argument
    if [ -t 0 ]; then
      watch -n3 -c "$0" show 2>/dev/null || {
        # watch -c not available everywhere; fall back to single run
        status
      }
    else
      status
    fi
    ;;
  show)
    clear
    status
    ;;
  restart)
    if [ -z "$2" ]; then
      echo "Usage: $0 restart <service>"
      echo "Services: ${!SERVICES[*]}"
      exit 1
    fi
    restart_service "$2"
    ;;
  *)
    echo "Usage: $0 [status|restart <service>]"
    ;;
esac
