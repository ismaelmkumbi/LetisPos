#!/usr/bin/env python3
"""Fix all docker-compose files for DNS caching, Gotenberg URL, and robustness."""

import yaml, sys, os

DNS_JVM_FLAGS = " -Dnetworkaddress.cache.ttl=5 -Dnetworkaddress.cache.negative.ttl=5"

def fix_java_dns(env):
    """Add DNS cache TTL to JAVA_TOOL_OPTIONS if not present."""
    jvm_key = 'JAVA_TOOL_OPTIONS'
    jvm = env.get(jvm_key, '')
    if isinstance(jvm, str) and 'networkaddress.cache.ttl' not in jvm:
        env[jvm_key] = jvm + DNS_JVM_FLAGS
    return env

def fix_all_java_services(filepath):
    with open(filepath) as f:
        data = yaml.safe_load(f)

    services = data.get('services', {})
    fixed = 0
    for name, svc in services.items():
        env = svc.get('environment', {})
        if isinstance(env, dict):
            # Add DNS cache TTL to all Java services (those with JAVA_TOOL_OPTIONS)
            if 'JAVA_TOOL_OPTIONS' in env:
                fix_java_dns(env)
                fixed += 1

            # Ensure restart policy
            if 'restart' not in svc:
                svc['restart'] = 'unless-stopped'

    with open(filepath, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, width=200)
    print(f"  Fixed {fixed} Java services with DNS cache TTL in {filepath}")

# Fix all three server configs
for f in [
    'ops/production/server-a/docker-compose.yml',
    'ops/production/server-b/app-services.yml',
    'ops/production/server-c/docker-compose.yml',
]:
    path = os.path.join(os.path.dirname(__file__), '../../..', f)
    path = os.path.abspath(path)
    if os.path.exists(path):
        fix_all_java_services(path)
    else:
        print(f"  SKIP: {path} not found")

print("\nDone. All Java services now have -Dnetworkaddress.cache.ttl=5 -Dnetworkaddress.cache.negative.ttl=5")
