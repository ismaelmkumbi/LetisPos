CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service VARCHAR(50) NOT NULL,
    actor_id UUID,
    actor_name VARCHAR(200),
    actor_role VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    target_label VARCHAR(500),
    diff JSONB,
    tenant_id UUID NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_events_action ON audit_events(tenant_id, action, timestamp DESC);
CREATE INDEX idx_audit_events_target ON audit_events(tenant_id, target_type, target_id);
CREATE INDEX idx_audit_events_service ON audit_events(service, timestamp DESC);

CREATE TABLE error_logs (
    id UUID PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    level VARCHAR(10) NOT NULL DEFAULT 'ERROR',
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    tenant_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_logs_tenant ON error_logs(tenant_id, occurred_at DESC);
CREATE INDEX idx_error_logs_service ON error_logs(service, occurred_at DESC);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    label VARCHAR(120) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]',
    created_by_id UUID,
    created_by_name VARCHAR(200),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);

CREATE TABLE retention_configs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purge_history (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    records_removed INT NOT NULL DEFAULT 0,
    triggered_by VARCHAR(20) NOT NULL DEFAULT 'SCHEDULE',
    triggered_by_actor VARCHAR(200),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
