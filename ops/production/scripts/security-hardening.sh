#!/bin/bash
# LetisPOS — Server security hardening
# =====================================
# Run once on each VPS. Idempotent (safe to re-run).
#
# Usage: bash security-hardening.sh

set -euo pipefail

echo "==> LetisPOS Security Hardening — $(date -u)"

# ── 1. UFW Firewall ──────────────────────────────────────────
echo "--- Firewall (UFW)"

ufw --force reset >/dev/null 2>&1

ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS (only Server A needs these — public internet)
MY_IP=$(hostname -I | grep -o '10.0.0.[0-9]*' || echo "")
if [ "$MY_IP" = "10.0.0.1" ]; then
    ufw allow 80/tcp   comment 'HTTP'
    ufw allow 443/tcp  comment 'HTTPS'
fi

# Private network — allow all traffic between 3 servers
ufw allow from 10.0.0.0/24 comment 'Private network — all inter-server traffic'

# LSA Agent API (metrics + logs + service management)
ufw allow from 10.0.0.0/24 to any port 9101 comment 'LSA Agent API'

ufw --force enable
echo "    UFW enabled"

# ── 2. SSH Hardening ─────────────────────────────────────────
echo "--- SSH Hardening"

cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%s)

# Apply hardening (idempotent via sed)
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
sed -i 's/^#\?ClientAliveInterval.*/ClientAliveInterval 300/' /etc/ssh/sshd_config
sed -i 's/^#\?ClientAliveCountMax.*/ClientAliveCountMax 2/' /etc/ssh/sshd_config
sed -i 's/^#\?LoginGraceTime.*/LoginGraceTime 30/' /etc/ssh/sshd_config
grep -q '^AllowUsers' /etc/ssh/sshd_config || echo 'AllowUsers root' >> /etc/ssh/sshd_config

systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null || true
echo "    SSH hardened"

# ── 3. Fail2Ban ──────────────────────────────────────────────
echo "--- Fail2Ban"

apt-get install -y -qq fail2ban >/dev/null 2>&1 || true

cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
port = http,https
maxretry = 5
F2B

systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban 2>/dev/null || true
echo "    Fail2Ban configured"

# ── 4. Kernel hardening (sysctl) ─────────────────────────────
echo "--- Kernel hardening"

cat > /etc/sysctl.d/99-letispos-security.conf << 'SYSCTL'
# IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore bogus ICMP errors
net.ipv4.icmp_ignore_bogus_error_responses = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log martian packets
net.ipv4.conf.all.log_martians = 1

# Increase TCP backlog
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048

# File descriptor limits
fs.file-max = 2097152
fs.nr_open = 1048576
SYSCTL

sysctl --system >/dev/null 2>&1
echo "    sysctl tuned"

# ── 5. Automatic security updates ────────────────────────────
echo "--- Unattended upgrades"

apt-get install -y -qq unattended-upgrades >/dev/null 2>&1 || true

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT

echo "    Auto-updates enabled"

# ── 6. Docker security ───────────────────────────────────────
if command -v docker &>/dev/null; then
    echo "--- Docker security"

    # Docker daemon hardening
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
  "live-restore": true
}
DOCKER
    systemctl restart docker 2>/dev/null || true
    echo "    Docker hardened"
fi

echo "==> Security hardening complete"
