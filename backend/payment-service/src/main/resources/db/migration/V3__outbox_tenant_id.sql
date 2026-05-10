-- Payment Service V3 — add tenant_id to outbox
--
-- The OutboxEvent entity was extended with a tenant_id column for
-- multi-tenant routing, but the schema was never migrated. Insert
-- statements emitted by Hibernate now reference the column, so
-- payments fail with: column "tenant_id" of relation "outbox" does not exist.

ALTER TABLE outbox ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_outbox_tenant_unpublished
    ON outbox (tenant_id, created_at)
    WHERE published_at IS NULL;
