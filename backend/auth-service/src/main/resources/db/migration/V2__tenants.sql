-- Tenant entity — enables multi-tenant isolation
-- Every tenant is a workspace with its own data scope, users, and billing plan.

CREATE TABLE tenants (
    id              UUID PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    slug            VARCHAR(80)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    billing_plan    VARCHAR(30)  NOT NULL DEFAULT 'FREE',
    max_users       INT          NOT NULL DEFAULT 5,
    max_stores      INT          NOT NULL DEFAULT 1,
    settings        JSONB        DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT tenants_status_chk CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED'))
);

CREATE UNIQUE INDEX idx_tenants_slug ON tenants (lower(slug));
