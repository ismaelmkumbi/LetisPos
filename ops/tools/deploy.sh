#!/bin/bash
# Letis Control Center — Deploy Script
# Run this ON THE SERVER: bash deploy.sh

set -e
cd /var/www/LetisPos

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Building control-hub ==="
cd backend
mvn -q -pl control-hub clean package -DskipTests

echo "=== Restarting hub ==="
pkill -f "control-hub.*jar" 2>/dev/null || true
sleep 2
nohup java -jar control-hub/target/control-hub-0.1.0-SNAPSHOT.jar \
  --spring.datasource.password=smartpos \
  > /dev/null 2>&1 &

echo "=== Waiting for startup ==="
sleep 12

echo "=== Testing endpoints ==="
echo "Servers:"
curl -s http://localhost:8100/api/v1/servers | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8100/api/v1/servers

echo ""
echo "Services:"
curl -s http://localhost:8100/api/v1/servers/vmi3268031/services | head -c 400

echo ""
echo "=== Dashboard ==="
echo "Open: http://controlcenter.letispos.com"
echo "Or:   http://109.199.122.118"
