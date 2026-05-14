-- V8__new_system_roles.sql
-- Rename ADMIN → SUPER_ADMIN and add TENANT_ADMIN + MANAGER system roles.

-- 1. Rename existing ADMIN → SUPER_ADMIN
UPDATE roles SET name = 'SUPER_ADMIN', label = 'Super Admin',
    description = 'Platform owner with full system access'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Create TENANT_ADMIN role with scoped permissions
INSERT INTO roles (id, name, label, description, tenant_id, is_system, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000003', 'TENANT_ADMIN', 'Tenant Admin',
        'Full control within own tenant — no platform access',
        NULL, true, now(), now());

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions WHERE name IN (
    'user.view', 'user.create', 'user.update', 'user.delete',
    'role.view', 'role.manage',
    'product.view', 'product.create', 'product.update', 'product.delete', 'category.manage',
    'customer.manage', 'supplier.manage', 'warehouse.manage',
    'stock.view', 'stock.transfer', 'stock.adjust', 'stock.count',
    'sale.view', 'sale.create', 'sale.update', 'sale.delete', 'sale.return',
    'pos.use', 'pos.terminal.view', 'pos.terminal.manage',
    'quotation.manage',
    'purchase.view', 'purchase.create', 'purchase.update', 'purchase.delete', 'purchase.return',
    'payment.view', 'payment.record', 'payment.refund',
    'account.manage', 'account.view', 'expense.manage', 'deposit.manage',
    'journal.view', 'journal.create', 'journal.update', 'journal.post', 'journal.delete',
    'report.sales', 'report.inventory', 'report.financial', 'report.export', 'report.financial.view',
    'settings.manage', 'settings.i18n',
    'notification.view', 'notification.send', 'notification.template.write',
    'hrm.view', 'hrm.manage', 'hrm.attendance.write', 'hrm.leave.request', 'hrm.leave.approve',
    'hrm.payroll.view', 'hrm.payroll.manage',
    'recurring.view', 'recurring.manage',
    'ai.insight', 'ai.chat',
    'integration.view', 'integration.zatca', 'integration.woo', 'integration.quickbooks',
    'internal.notification.send', 'internal.serial.write'
);

-- 3. Create MANAGER role
INSERT INTO roles (id, name, label, description, tenant_id, is_system, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000004', 'MANAGER', 'Manager',
        'Day-to-day operations without user/role management',
        NULL, true, now(), now());

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions WHERE name IN (
    'user.view',
    'product.view', 'product.create', 'product.update', 'product.delete', 'category.manage',
    'customer.manage', 'supplier.manage',
    'stock.view', 'stock.transfer', 'stock.adjust', 'stock.count',
    'sale.view', 'sale.create', 'sale.update', 'sale.delete', 'sale.return',
    'pos.use', 'pos.terminal.view',
    'purchase.view', 'purchase.create', 'purchase.update', 'purchase.delete', 'purchase.return',
    'payment.view', 'payment.record',
    'report.sales', 'report.inventory',
    'hrm.view', 'hrm.attendance.write', 'hrm.leave.request',
    'recurring.view', 'ai.insight', 'ai.chat'
);
