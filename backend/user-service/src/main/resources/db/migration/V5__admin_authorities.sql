-- User Service V5 — branch + billing + tenant lifecycle + audit/session admin authorities.
--
-- These authorities are required for the Branches + Billing Foundation
-- feature group. They are granted to the system ADMIN role.
-- The admin user created by auth-service AdminBootstrap receives all of
-- these via the ADMIN role assignment in AdminProfileBootstrap.

INSERT INTO permissions (id, name, description) VALUES
  (uuid_generate_v4(), 'admin',            'Full administrative access'),
  (uuid_generate_v4(), 'branch.view',      'View branches'),
  (uuid_generate_v4(), 'branch.manage',    'Create/update/delete branches'),
  (uuid_generate_v4(), 'billing.view',     'View billing plans and subscriptions'),
  (uuid_generate_v4(), 'billing.manage',   'Manage billing plans and subscriptions'),
  (uuid_generate_v4(), 'tenant.suspend',   'Suspend, reactivate, or close tenants'),
  (uuid_generate_v4(), 'audit.view',       'View audit logs'),
  (uuid_generate_v4(), 'session.manage',   'Manage user sessions'),
  (uuid_generate_v4(), 'retention.manage', 'Manage data retention policies'),
  (uuid_generate_v4(), 'error_log.view',   'View error logs'),
  (uuid_generate_v4(), 'api_key.manage',   'Manage API keys')
ON CONFLICT (name) DO NOTHING;

-- Grant every new permission to the system ADMIN role.
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
  FROM permissions p
 WHERE p.name IN (
    'admin', 'branch.view', 'branch.manage',
    'billing.view', 'billing.manage',
    'tenant.suspend', 'audit.view', 'session.manage',
    'retention.manage', 'error_log.view', 'api_key.manage'
 )
ON CONFLICT DO NOTHING;
