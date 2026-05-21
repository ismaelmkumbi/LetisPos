#!/bin/bash
# LetisPOS — PostgreSQL replica init script
# Runs inside the postgres-replica container on Server B.
# Sets up streaming replication from Server C (primary).

set -e

PRIMARY_HOST="${PRIMARY_HOST:-62.169.28.46}"
REPLICATION_USER="${PG_REPLICATION_USER:-replicator}"
REPLICATION_PASSWORD="${PG_REPLICATION_PASSWORD}"
SLOT_NAME="${PG_REPLICATION_SLOT:-replica_b}"

echo "==> Initializing PostgreSQL replica from ${PRIMARY_HOST}"

# Wipe existing data directory
rm -rf /var/lib/postgresql/data/*

# Base backup from primary
PGPASSWORD="${REPLICATION_PASSWORD}" pg_basebackup \
    -h "${PRIMARY_HOST}" \
    -U "${REPLICATION_USER}" \
    -D /var/lib/postgresql/data \
    -P \
    -R \
    -S "${SLOT_NAME}" \
    -X stream \
    -C

# Configure standby mode
cat >> /var/lib/postgresql/data/postgresql.auto.conf << CONF
primary_conninfo = 'host=${PRIMARY_HOST} port=5432 user=${REPLICATION_USER} password=${REPLICATION_PASSWORD}'
primary_slot_name = '${SLOT_NAME}'
hot_standby = on
CONF

touch /var/lib/postgresql/data/standby.signal

echo "==> Replica initialization complete"
