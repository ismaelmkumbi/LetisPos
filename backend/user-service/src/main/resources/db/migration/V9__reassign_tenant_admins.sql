-- V9__reassign_tenant_admins.sql
-- Reassign the first user in each tenant from SUPER_ADMIN to TENANT_ADMIN.

WITH first_users AS (
    SELECT DISTINCT ON (tenant_id) id AS user_id, tenant_id
    FROM user_profiles
    WHERE tenant_id IS NOT NULL
    ORDER BY tenant_id, created_at ASC
)
UPDATE user_roles ur
SET role_id = '00000000-0000-0000-0000-000000000003'
FROM first_users fu
WHERE ur.user_id = fu.user_id
  AND ur.role_id = '00000000-0000-0000-0000-000000000001';
