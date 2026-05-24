CREATE TABLE IF NOT EXISTS document_themes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    doc_type        VARCHAR(30) NOT NULL,
    primary_color   VARCHAR(10),
    accent_color    VARCHAR(10),
    font_family     VARCHAR(100),
    header_style    VARCHAR(20) NOT NULL DEFAULT 'solid',
    show_watermark  BOOLEAN     NOT NULL DEFAULT false,
    show_qr_code    BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP,
    UNIQUE (tenant_id, doc_type)
);
