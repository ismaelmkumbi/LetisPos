CREATE INDEX IF NOT EXISTS idx_documents_search
    ON documents (tenant_id, document_type, status, created_at DESC);
