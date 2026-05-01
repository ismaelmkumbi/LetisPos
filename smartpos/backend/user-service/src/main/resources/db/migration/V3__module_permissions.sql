-- User Service V3 — permissions for the new modules.
--
-- Modules 1–10 (Product enhancements, Notifications, Accounting, HRM,
-- Recurring invoices, Advanced reports, AI, POS hardware, Integrations,
-- i18n + offline) introduced new @PreAuthorize authorities that weren't
-- in the V1 seed. ADMIN already has every existing permission via the
-- V1 "all permissions" grant; we mirror that for the new ones.

INSERT INTO permissions (id, name, description) VALUES
  -- Notifications
  (uuid_generate_v4(), 'notification.view',           'View notification deliveries'),
  (uuid_generate_v4(), 'notification.send',           'Send a notification (ad-hoc or template)'),
  (uuid_generate_v4(), 'notification.template.write', 'Create/update/delete notification templates'),

  -- Accounting (chart of accounts + journal entries + financial statements)
  (uuid_generate_v4(), 'account.view',          'View chart of accounts'),
  (uuid_generate_v4(), 'journal.view',          'View journal entries'),
  (uuid_generate_v4(), 'journal.create',        'Create journal entries'),
  (uuid_generate_v4(), 'journal.update',        'Edit DRAFT journal entries'),
  (uuid_generate_v4(), 'journal.post',          'Post or void journal entries'),
  (uuid_generate_v4(), 'journal.delete',        'Delete DRAFT journal entries'),
  (uuid_generate_v4(), 'report.financial.view', 'View Trial Balance / P&L / Balance Sheet'),

  -- HRM
  (uuid_generate_v4(), 'hrm.view',              'View HR records'),
  (uuid_generate_v4(), 'hrm.manage',            'Manage org structure + employees'),
  (uuid_generate_v4(), 'hrm.attendance.write', 'Record attendance check-in/out'),
  (uuid_generate_v4(), 'hrm.leave.request',    'Submit / cancel own leave'),
  (uuid_generate_v4(), 'hrm.leave.approve',    'Approve / reject leave requests'),
  (uuid_generate_v4(), 'hrm.payroll.view',     'View payroll runs'),
  (uuid_generate_v4(), 'hrm.payroll.manage',   'Create / approve / pay payroll runs'),

  -- Recurring invoices (subscriptions)
  (uuid_generate_v4(), 'recurring.view',       'View recurring invoice templates'),
  (uuid_generate_v4(), 'recurring.manage',     'Manage recurring invoice templates'),

  -- AI insights
  (uuid_generate_v4(), 'ai.insight',           'Generate AI sales-trend / narrate insights'),
  (uuid_generate_v4(), 'ai.chat',              'Use the free-form AI chat'),

  -- POS hardware (terminals + customer display)
  (uuid_generate_v4(), 'pos.terminal.view',    'View registered POS terminals'),
  (uuid_generate_v4(), 'pos.terminal.manage',  'Register/rotate/manage POS terminals'),

  -- External integrations
  (uuid_generate_v4(), 'integration.view',        'View integration sync log'),
  (uuid_generate_v4(), 'integration.zatca',       'Generate ZATCA invoice QR'),
  (uuid_generate_v4(), 'integration.woo',         'Push to WooCommerce'),
  (uuid_generate_v4(), 'integration.quickbooks',  'Push to QuickBooks Online'),

  -- i18n admin
  (uuid_generate_v4(), 'settings.i18n',         'Manage languages and translations'),

  -- Internal service-to-service authorities (granted only to system roles)
  (uuid_generate_v4(), 'internal.notification.send', 'Internal: notification dispatch hook'),
  (uuid_generate_v4(), 'internal.serial.write',      'Internal: sales-service flips serial status');

-- Grant every newly-introduced permission to ADMIN. Existing permissions
-- were already bound by the V1 "SELECT id FROM permissions" grant.
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
  FROM permissions p
 WHERE p.name IN (
    'notification.view','notification.send','notification.template.write',
    'account.view','journal.view','journal.create','journal.update',
    'journal.post','journal.delete','report.financial.view',
    'hrm.view','hrm.manage','hrm.attendance.write','hrm.leave.request',
    'hrm.leave.approve','hrm.payroll.view','hrm.payroll.manage',
    'recurring.view','recurring.manage',
    'ai.insight','ai.chat',
    'pos.terminal.view','pos.terminal.manage',
    'integration.view','integration.zatca','integration.woo','integration.quickbooks',
    'settings.i18n',
    'internal.notification.send','internal.serial.write'
 )
ON CONFLICT DO NOTHING;
