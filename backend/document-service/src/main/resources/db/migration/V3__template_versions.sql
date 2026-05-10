CREATE TABLE template_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_override_id UUID NOT NULL REFERENCES template_overrides(id),
    version_number      INT NOT NULL,
    body_html           TEXT NOT NULL,
    change_description  VARCHAR(300),
    updated_by          UUID,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (template_override_id, version_number)
);

CREATE INDEX idx_tpl_versions_override ON template_versions (template_override_id);
