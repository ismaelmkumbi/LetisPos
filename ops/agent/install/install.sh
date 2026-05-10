#!/usr/bin/env bash
set -e

BIN_URL="${LSA_DOWNLOAD_URL:-https://control.letispos.com/bin/lsa-linux-amd64}"
CONFIG_URL="${LSA_CONFIG_URL:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: curl ... | sudo bash"
  exit 1
fi

echo "→ Downloading lsa..."
curl -fsSL "$BIN_URL" -o /usr/local/bin/lsa
chmod 755 /usr/local/bin/lsa

if [ -n "$CONFIG_URL" ]; then
  echo "→ Downloading config..."
  mkdir -p /etc/lsa
  curl -fsSL "$CONFIG_URL" -o /etc/lsa/config.yaml
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "→ Installing systemd service..."
cp "$SCRIPT_DIR/lsa.service" /etc/systemd/system/lsa.service
systemctl daemon-reload
systemctl enable lsa
systemctl start lsa

echo "✓ LSA installed and running"
systemctl status lsa --no-pager
