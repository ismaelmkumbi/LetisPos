CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    report_key VARCHAR(100) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    cron_expression VARCHAR(50),
    recipients VARCHAR(500) NOT NULL,
    format VARCHAR(10) DEFAULT 'PDF',
    active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);
