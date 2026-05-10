CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    version VARCHAR(20),
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'online'
);

CREATE TABLE IF NOT EXISTS metric_points (
    id BIGSERIAL,
    time TIMESTAMPTZ NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    cpu_percent DOUBLE PRECISION,
    mem_used_bytes BIGINT,
    mem_total_bytes BIGINT,
    disk_used_bytes BIGINT,
    disk_total_bytes BIGINT,
    net_rx_bytes BIGINT,
    net_tx_bytes BIGINT,
    load1 DOUBLE PRECISION,
    load5 DOUBLE PRECISION,
    load15 DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_metric_server_time
    ON metric_points (server_name, time DESC);

DO $$
BEGIN
    PERFORM create_hypertable('metric_points', 'time', if_not_exists => true);
END $$;
