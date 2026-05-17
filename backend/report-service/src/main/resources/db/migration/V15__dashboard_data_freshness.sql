CREATE TABLE IF NOT EXISTS dashboard_data_freshness (
    source           VARCHAR(64) PRIMARY KEY,
    last_updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status           VARCHAR(16) NOT NULL DEFAULT 'FRESH',
    error_message    TEXT,
    checked_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO dashboard_data_freshness (source, last_updated_at, status) VALUES
    ('sales', NOW(), 'FRESH'),
    ('inventory', NOW(), 'FRESH'),
    ('payments', NOW(), 'FRESH'),
    ('purchases', NOW(), 'FRESH'),
    ('customers', NOW(), 'FRESH')
ON CONFLICT (source) DO NOTHING;
