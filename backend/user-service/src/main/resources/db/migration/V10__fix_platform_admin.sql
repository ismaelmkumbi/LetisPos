-- V10__fix_platform_admin.sql
-- The platform admin user (admin@smartpos.local) has tenant_id set to the
-- default tenant UUID instead of null. V9 mistakenly reassigned them from
-- SUPER_ADMIN to TENANT_ADMIN. Fix: set tenant_id to null and restore
-- SUPER_ADMIN role.

-- 1. Set platform admin's tenant_id to null so they are cross-tenant
UPDATE user_profiles
SET tenant_id = NULL
WHERE email = 'admin@smartpos.local';

-- 2. Restore SUPER_ADMIN role (remove TENANT_ADMIN, add SUPER_ADMIN)
DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM user_profiles WHERE email = 'admin@smartpos.local')
  AND role_id = '00000000-0000-0000-0000-000000000003'; -- TENANT_ADMIN

INSERT INTO user_roles (user_id, role_id)
SELECT id, '00000000-0000-0000-0000-000000000001' -- SUPER_ADMIN
FROM user_profiles
WHERE email = 'admin@smartpos.local'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_profiles.id
      AND role_id = '00000000-0000-0000-0000-000000000001'
  );
