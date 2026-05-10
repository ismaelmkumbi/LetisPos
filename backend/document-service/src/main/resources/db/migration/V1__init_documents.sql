CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    document_type   VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    storage_path    VARCHAR(500),
    content_type    VARCHAR(100) DEFAULT 'application/pdf',
    size_bytes      BIGINT,
    watermark       VARCHAR(30),
    created_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant_type ON documents (tenant_id, document_type);
CREATE INDEX idx_documents_reference ON documents (reference_type, reference_id);
CREATE INDEX idx_documents_status ON documents (tenant_id, status);

CREATE TABLE template_overrides (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    name          VARCHAR(200),
    body_html     TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    version       INT NOT NULL DEFAULT 1,
    updated_by    UUID,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, document_type)
);

CREATE INDEX idx_template_overrides_tenant ON template_overrides (tenant_id);
