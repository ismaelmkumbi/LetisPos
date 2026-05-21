#!/bin/bash
# LetisPOS — Server provisioning script
# ======================================
# Idempotent setup: Docker, directories, configs, sysctl, firewall.
# Run on each server before deploying compose files.
#
# Usage (on each server):
#   ssh root@<server> 'bash -s' < server-setup.sh
# Or:
#   ROLE=app  bash server-setup.sh   # Server A
#   ROLE=ops  bash server-setup.sh   # Server B
#   ROLE=data bash server-setup.sh   # Server C

set -euo pipefail

ROLE="${ROLE:-app}"
echo "==> LetisPOS Server Setup — Role: ${ROLE} — $(date -u)"

# ── 1. Base system ──────────────────────────────────────────
echo "--- System update"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget gnupg2 ca-certificates lsb-release \
    htop iotop iftop net-tools dnsutils \
    git rsync jq postgresql-client-16 \
    ufw fail2ban unattended-upgrades

# ── 2. Docker ────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "--- Installing Docker"
    curl -fsSL https://get.docker.com | sh
fi

# Docker daemon config
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKER'
{
  "icc": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  },
  "userland-proxy": false,
  "no-new-privileges": true,
  "live-restore": true,
  "storage-driver": "overlay2"
}
DOCKER
systemctl enable docker
systemctl restart docker

# ── 3. Directory structure ──────────────────────────────────
echo "--- Creating directories"
mkdir -p /etc/letispos/{nginx/conf.d,scripts,prometheus,grafana,loki,promtail,alertmanager,monitoring/rules,jwt}
mkdir -p /data/{postgres,redis,kafka,backups}
mkdir -p /var/cache/nginx/jwks
mkdir -p /var/www/certbot

# ── 4. sysctl — performance ─────────────────────────────────
echo "--- Kernel tuning"
cat > /etc/sysctl.d/99-letispos-perf.conf << 'SYSCTL'
# Network
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 5
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Memory
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50
vm.min_free_kbytes = 65536

# File descriptors
fs.file-max = 2097152
fs.nr_open = 1048576
fs.inotify.max_user_watches = 524288
fs.aio-max-nr = 1048576

# Disable swap (containers hate swap)
vm.swappiness = 1

# PostgreSQL-friendly (for Server C)
kernel.shmmax = 4294967296
SYSCTL

sysctl --system >/dev/null 2>&1

# ── 5. limits.conf ──────────────────────────────────────────
cat > /etc/security/limits.d/99-letispos.conf << 'LIMITS'
*       soft    nofile  1048576
*       hard    nofile  1048576
*       soft    nproc   65536
*       hard    nproc   65536
root    soft    nofile  1048576
root    hard    nofile  1048576
LIMITS

# ── 6. Role-specific setup ──────────────────────────────────

if [ "$ROLE" = "data" ]; then
    echo "--- Data server (Server C) specific setup"
    # NVMe I/O scheduler (none for NVMe)
    echo "none" > /sys/block/sda/queue/scheduler 2>/dev/null || true
    # PostgreSQL data directory
    mkdir -p /data/postgres /data/redis /data/kafka
    chmod 700 /data/postgres

elif [ "$ROLE" = "app" ]; then
    echo "--- App server (Server A) specific setup"
    # Placeholder for SSL certs
    if [ ! -f /etc/letsencrypt/live/letispos.com/fullchain.pem ]; then
        echo "    NOTE: Run certbot to obtain SSL certificates"
    fi

elif [ "$ROLE" = "ops" ]; then
    echo "--- Ops server (Server B) specific setup"
    mkdir -p /data/{prometheus,grafana,loki,postgres-replica}
fi

# ── 7. Docker cron cleanup (weekly) ──────────────────────────
cat > /etc/cron.d/docker-cleanup << 'CRON'
0 3 * * 0 root docker system prune -af --filter "until=168h" >/dev/null 2>&1
0 4 * * 0 root docker image prune -af --filter "until=72h" >/dev/null 2>&1
CRON

# ── 8. LSA Agent (native host metrics + log streaming) ─────
echo "--- Installing LSA Agent"
cp /opt/letispos/production/agent/lsa-linux-amd64 /usr/local/bin/lsa-agent
chmod +x /usr/local/bin/lsa-agent
mkdir -p /etc/lsa

case "$ROLE" in
  app)  cp /opt/letispos/production/lsa/config-server-a.yaml /etc/lsa/config.yaml ;;
  ops)  cp /opt/letispos/production/lsa/config-server-b.yaml /etc/lsa/config.yaml ;;
  data) cp /opt/letispos/production/lsa/config-server-c.yaml /etc/lsa/config.yaml ;;
esac

cp /opt/letispos/production/systemd/lsa-agent.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now lsa-agent

# ── 9. Done ─────────────────────────────────────────────────
echo "==> Setup complete for role: ${ROLE}"
echo "    Next: copy docker-compose.yml and .env, then run:"
echo "    docker compose -f docker-compose.yml up -d"
