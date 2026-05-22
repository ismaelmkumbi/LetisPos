#!/usr/bin/env python3
"""Add JAVA_TOOL_OPTIONS and bump memory limits in docker-compose.yml"""
import re, subprocess, sys

COMPOSE_PATH = sys.argv[1] if len(sys.argv) > 1 else "/opt/letispos/production/server-a/docker-compose.yml"

with open(COMPOSE_PATH) as f:
    content = f.read()

JVM_FLAGS = (
    "-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 "
    "-XX:InitialRAMPercentage=50.0 -XX:+UseZGC "
    "-XX:ZCollectionInterval=10 -XX:+ExitOnOutOfMemoryError"
)
jvm_line = f'      JAVA_TOOL_OPTIONS: "{JVM_FLAGS}"\n'

# Add JAVA_TOOL_OPTIONS after each SERVER_PORT line
lines = content.split("\n")
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if "SERVER_PORT:" in line:
        has_jvm = any("JAVA_TOOL_OPTIONS" in lines[j] for j in range(i+1, min(i+6, len(lines))))
        if not has_jvm:
            new_lines.append(jvm_line.rstrip())

content = "\n".join(new_lines)

# Memory bumps: 384M→512M (with reservations)
content = content.replace(
    "memory: 384M\n          reservations:\n            memory: 128M",
    "memory: 512M\n          reservations:\n            memory: 192M"
)
# auth: 448M→640M
content = content.replace(
    "memory: 448M\n          reservations:\n            memory: 192M",
    "memory: 640M\n          reservations:\n            memory: 256M"
)

with open(COMPOSE_PATH, "w") as f:
    f.write(content)

print(f"JAVA_TOOL_OPTIONS count: {content.count('JAVA_TOOL_OPTIONS')}")
r = subprocess.run(
    ["docker", "compose", "-f", COMPOSE_PATH, "config", "--no-interpolate"],
    capture_output=True, text=True
)
if r.returncode == 0:
    print("YAML valid")
else:
    print(f"YAML error: {r.stderr[:300]}")
    sys.exit(1)
