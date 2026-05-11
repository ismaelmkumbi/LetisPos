CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id),
    version_number  INT NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    change_type     VARCHAR(30) NOT NULL DEFAULT 'created',
    change_summary  VARCHAR(500),
    created_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_number)
);

CREATE INDEX idx_doc_versions_document ON document_versions (document_id);
