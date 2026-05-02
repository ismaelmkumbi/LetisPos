#!/usr/bin/env bash
# Convenience launcher for ai-service that loads .env.local first.
# Usage:  ./run-ai-service.sh
set -e
cd "$(dirname "$0")"

if [[ -f .env.local ]]; then
  echo "→ loading .env.local"
  set -o allexport
  # shellcheck disable=SC1091
  source .env.local
  set +o allexport
else
  echo "⚠  .env.local not found — falling back to stub provider"
fi

echo "→ AI_PROVIDER=${AI_PROVIDER:-stub}"
exec mvn spring-boot:run -pl ai-service
