-- Assign a default tenant to users with null tenant_id.
-- This fixes bootstrap admin accounts created before multi-tenant was introduced,
-- and any other users that lack a workspace assignment.

-- 1. Create a default workspace if none exists
INSERT INTO tenants (id, name, slug, status, billing_plan, max_users, max_stores)
SELECT '00000000-0000-0000-0000-000000000001', 'Default Workspace', 'default',
       'ACTIVE', 'ENTERPRISE', 2147483647, 2147483647
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- 2. Assign users with null tenant_id to the first available tenant
UPDATE users
SET tenant_id = (SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;
