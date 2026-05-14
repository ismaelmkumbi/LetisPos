-- V9__set_admin_tenant_null.sql
-- Platform admin should have null tenant_id for cross-tenant access.
-- The bootstrap created them in the default tenant, but they need
-- to be cross-tenant to manage all tenants.

UPDATE users SET tenant_id = NULL WHERE email = 'admin@smartpos.local';
