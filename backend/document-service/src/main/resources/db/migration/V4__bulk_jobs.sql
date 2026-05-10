CREATE TABLE bulk_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    document_type   VARCHAR(50) NOT NULL,
    reference_type  VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    progress        INT NOT NULL DEFAULT 0,
    total           INT NOT NULL DEFAULT 0,
    results_json    TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulk_jobs_tenant ON bulk_jobs (tenant_id);
