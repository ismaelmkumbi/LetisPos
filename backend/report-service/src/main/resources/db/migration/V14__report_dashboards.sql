CREATE TABLE IF NOT EXISTS report_dashboards (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID,
    name VARCHAR(200) NOT NULL,
    layout JSONB NOT NULL DEFAULT '[]',
    filters JSONB DEFAULT '{}',
    shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
