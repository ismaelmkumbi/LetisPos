#!/usr/bin/env bash
# LetisPOS — Dev Status Server
# Serves a live HTML dashboard at http://localhost:9999 showing all service health.
# Usage: make status-ui
set -e
cd "$(dirname "$0")/../../.."

check() { lsof -i ":$1" -sTCP:LISTEN &>/dev/null && echo "up" || echo "down"; }

cat <<'PYEOF' | python3 &
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess, json, os

PORT = 9999
ROOT = os.path.dirname(os.path.abspath(__file__))

HTML = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LetisPOS — Dev Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
  h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 0.8rem; margin-bottom: 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; }
  .row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #1e293b; border-radius: 10px; margin-bottom: 6px; }
  .row:hover { background: #273348; }
  .name { flex: 1; font-weight: 600; font-size: 0.875rem; }
  .port { color: #64748b; font-size: 0.75rem; width: 50px; text-align: right; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .up { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
  .down { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5); }
  .status { font-size: 0.75rem; font-weight: 600; width: 44px; }
  .up-text { color: #22c55e; }
  .down-text { color: #ef4444; }
  .refresh { font-size: 0.7rem; color: #64748b; margin-top: 16px; }
  .summary { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { background: #1e293b; border-radius: 10px; padding: 12px 18px; text-align: center; }
  .stat-num { font-size: 1.5rem; font-weight: 800; }
  .stat-label { font-size: 0.7rem; color: #64748b; }
</style>
</head>
<body>
  <h1>LetisPOS Dev Dashboard</h1>
  <p class="sub">Auto-refreshes every 5s · <span id="time"></span></p>

  <div class="summary">
    <div class="stat"><div class="stat-num" id="total" style="color:#e2e8f0">-</div><div class="stat-label">Total</div></div>
    <div class="stat"><div class="stat-num" id="upCount" style="color:#22c55e">-</div><div class="stat-label">Running</div></div>
    <div class="stat"><div class="stat-num" id="downCount" style="color:#ef4444">-</div><div class="stat-label">Down</div></div>
  </div>
  <div id="content">Loading...</div>
  <p class="refresh">Last check: <span id="lastCheck">-</span></p>

<script>
const SERVICES = [
  { section: "Infrastructure", items: [
    { name: "PostgreSQL", port: 5434 },
    { name: "Redis", port: 6379 },
    { name: "MinIO", port: 9001 },
    { name: "MailHog", port: 8025 },
  ]},
  { section: "Backend Services", items: [
    { name: "Gateway", port: 8080 },
    { name: "Auth Service", port: 8081 },
    { name: "User Service", port: 8082 },
    { name: "Product Service", port: 8083 },
    { name: "Inventory Service", port: 8084 },
    { name: "Sales Service", port: 8085 },
    { name: "Payment Service", port: 8086 },
    { name: "Report Service", port: 8087 },
    { name: "Notification Service", port: 8089 },
    { name: "HRM Service", port: 8090 },
    { name: "AI Service", port: 8091 },
    { name: "Integration Service", port: 8092 },
  ]},
  { section: "Frontend", items: [
    { name: "Vite Dev Server", port: 5173 },
    { name: "Portainer", port: 9443 },
    { name: "Dev Dashboard", port: 9999 },
  ]},
];

async function check() {
  const results = [];
  for (const group of SERVICES) {
    const items = await Promise.all(group.items.map(async (item) => {
      try {
        const res = await fetch("http://localhost:" + item.port + "/", { mode: "no-cors", signal: AbortSignal.timeout(2000) });
        return { ...item, up: true };
      } catch {
        return { ...item, up: false };
      }
    }));
    results.push({ section: group.section, items });
  }
  render(results);
}

function render(groups) {
  let total = 0, up = 0, down = 0;
  let html = "";
  for (const group of groups) {
    html += '<div class="section"><div class="section-title">' + group.section + '</div>';
    for (const item of group.items) {
      total++; item.up ? up++ : down++;
      html += '<div class="row">'
        + '<div class="dot ' + (item.up ? 'up' : 'down') + '"></div>'
        + '<div class="name">' + item.name + '</div>'
        + '<div class="port">:' + item.port + '</div>'
        + '<div class="status ' + (item.up ? 'up-text' : 'down-text') + '">' + (item.up ? 'UP' : 'DOWN') + '</div>'
        + '</div>';
    }
    html += '</div>';
  }
  document.getElementById("content").innerHTML = html;
  document.getElementById("total").textContent = total;
  document.getElementById("upCount").textContent = up;
  document.getElementById("downCount").textContent = down;
  document.getElementById("lastCheck").textContent = new Date().toLocaleTimeString();
}

check();
setInterval(check, 5000);
setInterval(() => { document.getElementById("time").textContent = new Date().toLocaleTimeString(); }, 1000);
</script>
</body>
</html>'''

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(HTML.encode())

    def log_message(self, fmt, *args):
        pass

print(f"Dashboard running at http://localhost:{PORT}")
HTTPServer(("", PORT), Handler).serve_forever()
PYEOF

echo "Dashboard: http://localhost:9999"
