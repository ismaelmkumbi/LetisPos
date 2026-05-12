CREATE TABLE leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    company VARCHAR(200),
    phone VARCHAR(30),
    email VARCHAR(200),
    source VARCHAR(30) NOT NULL DEFAULT 'other',
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    notes TEXT,
    assigned_to UUID,
    converted_to_opportunity_id UUID,
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE opportunities (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(300) NOT NULL,
    customer_id UUID,
    customer_name VARCHAR(200),
    value_tzs BIGINT NOT NULL DEFAULT 0,
    probability INT NOT NULL DEFAULT 50,
    stage VARCHAR(20) NOT NULL DEFAULT 'new',
    expected_close_date DATE,
    lead_id UUID REFERENCES leads(id),
    assigned_to UUID,
    notes TEXT,
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follow_ups (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    customer_id UUID,
    customer_name VARCHAR(200),
    type VARCHAR(20) NOT NULL DEFAULT 'call',
    due_date DATE NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    assigned_to UUID,
    created_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activities (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    customer_id UUID,
    customer_name VARCHAR(200),
    related_type VARCHAR(30),
    related_id UUID,
    performed_by UUID,
    performed_by_name VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id, status);
CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id, stage);
CREATE INDEX idx_followups_tenant ON follow_ups(tenant_id, due_date);
CREATE INDEX idx_activities_tenant ON activities(tenant_id, created_at DESC);
