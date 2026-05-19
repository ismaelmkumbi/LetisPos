-- =============================================================================
-- V12: Seed feature definitions, plan assignments, menu tree, and path mappings
--       from current hardcoded configuration (FeatureGateFilter / SmartPosMenuItems)
-- =============================================================================

-- 1. Seed feature_definitions (67 features)
INSERT INTO feature_definitions (key, label, category, sort_order) VALUES
('pos.use',              'POS Terminal Access',       'SALES',          1),
('sale.view',            'View Sales',                'SALES',          2),
('sale.create',          'Create Sales',              'SALES',          3),
('sale.return',          'Sales Returns',             'SALES',          4),
('product.view',         'View Products',             'PRODUCTS',       5),
('product.create',       'Create Products',           'PRODUCTS',       6),
('product.update',       'Update Products',           'PRODUCTS',       7),
('product.delete',       'Delete Products',           'PRODUCTS',       8),
('category.manage',      'Manage Categories',         'PRODUCTS',       9),
('stock.view',           'View Stock',                'STOCK',          10),
('stock.transfer',       'Stock Transfers',           'STOCK',          11),
('stock.adjust',         'Stock Adjustments',         'STOCK',          12),
('stock.count',          'Stock Counts',              'STOCK',          13),
('purchase.view',        'View Purchases',            'PURCHASING',     14),
('purchase.create',      'Create Purchases',          'PURCHASING',     15),
('purchase.update',      'Update Purchases',          'PURCHASING',     16),
('purchase.delete',      'Delete Purchases',          'PURCHASING',     17),
('purchase.return',      'Purchase Returns',          'PURCHASING',     18),
('payment.view',         'View Payments',             'FINANCE',        19),
('payment.record',       'Record Payments',           'FINANCE',        20),
('payment.refund',       'Refund Payments',           'FINANCE',        21),
('account.manage',       'Manage Accounts',           'FINANCE',        22),
('expense.manage',       'Manage Expenses',           'FINANCE',        23),
('accounting.module',    'Accounting Module',         'FINANCE',        24),
('account.view',         'View Accounts',             'FINANCE',        25),
('journal.view',         'View Journal',              'FINANCE',        26),
('journal.create',       'Create Journal Entry',      'FINANCE',        27),
('journal.post',         'Post Journal Entry',        'FINANCE',        28),
('report.financial.view','View Financial Reports',    'FINANCE',        29),
('hrm.module',           'HR & Payroll Module',       'HRM',            30),
('hrm.view',             'View HR',                   'HRM',            31),
('hrm.manage',           'Manage HR',                 'HRM',            32),
('hrm.attendance.write', 'Write Attendance',          'HRM',            33),
('hrm.leave.request',    'Request Leave',             'HRM',            34),
('hrm.leave.approve',    'Approve Leave',             'HRM',            35),
('hrm.payroll.view',     'View Payroll',              'HRM',            36),
('hrm.payroll.manage',   'Manage Payroll',            'HRM',            37),
('crm.module',           'CRM Module',                'CRM',            38),
('marketing.module',     'Marketing Module',          'MARKETING',      39),
('ai.module',            'AI & Insights Module',      'AI',             40),
('ai.insight',           'AI Insights',               'AI',             41),
('ai.chat',              'AI Chat',                   'AI',             42),
('admin',                'Admin Access',              'ADMIN',          43),
('user.view',            'View Users',                'ADMIN',          44),
('user.create',          'Create Users',              'ADMIN',          45),
('user.update',          'Update Users',              'ADMIN',          46),
('user.delete',          'Delete Users',              'ADMIN',          47),
('role.view',            'View Roles',                'ADMIN',          48),
('role.manage',          'Manage Roles',              'ADMIN',          49),
('branch.view',          'View Branches',             'ADMIN',          50),
('branch.manage',        'Manage Branches',           'ADMIN',          51),
('billing.view',         'View Billing',              'ADMIN',          52),
('billing.manage',       'Manage Billing',            'ADMIN',          53),
('tenant.suspend',       'Suspend Tenants',           'ADMIN',          54),
('audit.view',           'View Audit Logs',           'ADMIN',          55),
('session.manage',       'Manage Sessions',           'ADMIN',          56),
('integration.module',   'Integration Module',        'INTEGRATIONS',   57),
('integration.view',     'View Integrations',         'INTEGRATIONS',   58),
('integration.zatca',    'ZATCA Integration',         'INTEGRATIONS',   59),
('integration.woo',      'WooCommerce Integration',   'INTEGRATIONS',   60),
('report.sales',         'Sales Reports',             'REPORTS',        61),
('report.inventory',     'Inventory Reports',         'REPORTS',        62),
('report.financial',     'Financial Reports',         'REPORTS',        63),
('report.export',        'Export Reports',            'REPORTS',        64),
('report.custom',        'Custom Reports',            'REPORTS',        65),
('notification.view',    'View Notifications',        'NOTIFICATIONS',  66),
('notification.send',    'Send Notifications',        'NOTIFICATIONS',  67);


-- 2. Seed feature_assignments at PLAN level (matching FeatureGateFilter)

-- 2a. STARTER (19 features)
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('pos.use',          'PLAN', 'STARTER', true),
('sale.view',        'PLAN', 'STARTER', true),
('sale.create',      'PLAN', 'STARTER', true),
('sale.return',      'PLAN', 'STARTER', true),
('product.view',     'PLAN', 'STARTER', true),
('product.create',   'PLAN', 'STARTER', true),
('product.update',   'PLAN', 'STARTER', true),
('product.delete',   'PLAN', 'STARTER', true),
('category.manage',  'PLAN', 'STARTER', true),
('stock.view',       'PLAN', 'STARTER', true),
('stock.transfer',   'PLAN', 'STARTER', true),
('stock.adjust',     'PLAN', 'STARTER', true),
('stock.count',      'PLAN', 'STARTER', true),
('payment.view',     'PLAN', 'STARTER', true),
('payment.record',   'PLAN', 'STARTER', true),
('report.sales',     'PLAN', 'STARTER', true),
('report.inventory', 'PLAN', 'STARTER', true),
('user.view',        'PLAN', 'STARTER', true),
('notification.view','PLAN', 'STARTER', true);

-- 2b. BUSINESS (STARTER + 17 additional)
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('purchase.view',         'PLAN', 'BUSINESS', true),
('purchase.create',       'PLAN', 'BUSINESS', true),
('purchase.update',       'PLAN', 'BUSINESS', true),
('purchase.delete',       'PLAN', 'BUSINESS', true),
('purchase.return',       'PLAN', 'BUSINESS', true),
('payment.refund',        'PLAN', 'BUSINESS', true),
('account.manage',        'PLAN', 'BUSINESS', true),
('expense.manage',        'PLAN', 'BUSINESS', true),
('accounting.module',     'PLAN', 'BUSINESS', true),
('account.view',          'PLAN', 'BUSINESS', true),
('journal.view',          'PLAN', 'BUSINESS', true),
('journal.create',        'PLAN', 'BUSINESS', true),
('journal.post',          'PLAN', 'BUSINESS', true),
('report.financial.view', 'PLAN', 'BUSINESS', true),
('marketing.module',      'PLAN', 'BUSINESS', true),
('report.financial',      'PLAN', 'BUSINESS', true),
('report.export',         'PLAN', 'BUSINESS', true);

-- 2c. PROFESSIONAL (STARTER + BUSINESS + 21 additional)
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('hrm.module',           'PLAN', 'PROFESSIONAL', true),
('hrm.view',             'PLAN', 'PROFESSIONAL', true),
('hrm.manage',           'PLAN', 'PROFESSIONAL', true),
('hrm.attendance.write', 'PLAN', 'PROFESSIONAL', true),
('hrm.leave.request',    'PLAN', 'PROFESSIONAL', true),
('hrm.leave.approve',    'PLAN', 'PROFESSIONAL', true),
('hrm.payroll.view',     'PLAN', 'PROFESSIONAL', true),
('hrm.payroll.manage',   'PLAN', 'PROFESSIONAL', true),
('crm.module',           'PLAN', 'PROFESSIONAL', true),
('ai.module',            'PLAN', 'PROFESSIONAL', true),
('ai.insight',           'PLAN', 'PROFESSIONAL', true),
('ai.chat',              'PLAN', 'PROFESSIONAL', true),
('integration.module',   'PLAN', 'PROFESSIONAL', true),
('integration.view',     'PLAN', 'PROFESSIONAL', true),
('integration.zatca',    'PLAN', 'PROFESSIONAL', true),
('integration.woo',      'PLAN', 'PROFESSIONAL', true),
('branch.view',          'PLAN', 'PROFESSIONAL', true),
('branch.manage',        'PLAN', 'PROFESSIONAL', true),
('audit.view',           'PLAN', 'PROFESSIONAL', true),
('session.manage',       'PLAN', 'PROFESSIONAL', true),
('notification.send',    'PLAN', 'PROFESSIONAL', true);

-- 2d. ENTERPRISE (STARTER + BUSINESS + PRO + 10 additional)
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('admin',          'PLAN', 'ENTERPRISE', true),
('user.create',    'PLAN', 'ENTERPRISE', true),
('user.update',    'PLAN', 'ENTERPRISE', true),
('user.delete',    'PLAN', 'ENTERPRISE', true),
('role.view',      'PLAN', 'ENTERPRISE', true),
('role.manage',    'PLAN', 'ENTERPRISE', true),
('billing.view',   'PLAN', 'ENTERPRISE', true),
('billing.manage', 'PLAN', 'ENTERPRISE', true),
('tenant.suspend', 'PLAN', 'ENTERPRISE', true),
('report.custom',  'PLAN', 'ENTERPRISE', true);


-- 3. Seed menu_definitions (matching SmartPosMenuItems.ts)

-- 3a. Section headers (fixed UUIDs so menu items can reference them)
INSERT INTO menu_definitions (id, key, label, icon, route, sort_order, is_section_header) VALUES
('00000000-0000-0000-0000-000000000001', 'section-dashboard',   'Dashboard',    'layout-dashboard', NULL,    1,  true),
('00000000-0000-0000-0000-000000000002', 'section-sales',       'Sales Desk',   'cash-register',    NULL,    2,  true),
('00000000-0000-0000-0000-000000000003', 'section-products',    'Products',     'package',          NULL,    3,  true),
('00000000-0000-0000-0000-000000000004', 'section-stock',       'Stock',        'boxes',            NULL,    4,  true),
('00000000-0000-0000-0000-000000000005', 'section-purchasing',  'Purchasing',   'truck',            NULL,    5,  true),
('00000000-0000-0000-0000-000000000006', 'section-customers',   'Customers',    'users',            NULL,    6,  true),
('00000000-0000-0000-0000-000000000007', 'section-finance',     'Finance',      'cash',             NULL,    7,  true),
('00000000-0000-0000-0000-000000000008', 'section-reports',     'Reports',      'chart-bar',        NULL,    8,  true),
('00000000-0000-0000-0000-000000000009', 'section-marketing',   'Marketing',    'megaphone',        NULL,    9,  true),
('00000000-0000-0000-0000-00000000000a', 'section-hrm',         'HR & Payroll', 'users-group',      NULL,    10, true),
('00000000-0000-0000-0000-00000000000b', 'section-crm',         'CRM',          'address-book',     NULL,    11, true),
('00000000-0000-0000-0000-00000000000c', 'section-ecommerce',   'E-Commerce',   'world',            NULL,    12, true),
('00000000-0000-0000-0000-00000000000d', 'section-ai',          'AI Insights',  'brain',            NULL,    13, true),
('00000000-0000-0000-0000-00000000000e', 'section-admin',       'Admin',        'settings',         NULL,    14, true),
('00000000-0000-0000-0000-00000000000f', 'section-support',     'Support',      'help-circle',      NULL,    15, true);

-- 3b. Menu items (referencing section headers via parent_id)

-- Dashboard
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'menu-dashboard', 'Dashboard', 'layout-dashboard', '/dashboard', NULL, 1);

-- Sales Desk
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000002', 'menu-pos',   'Point of Sale', 'cash-register', '/pos',   'pos.use',   1),
('00000000-0000-0000-0000-000000000002', 'menu-sales', 'Sales',         'shopping-cart', '/sales', 'sale.view', 2);

-- Products
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000003', 'menu-products',   'Products',   'package',  '/products',           'product.view',    1),
('00000000-0000-0000-0000-000000000003', 'menu-categories', 'Categories', 'category', '/products/categories', 'category.manage', 2);

-- Stock
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000004', 'menu-stock', 'Stock', 'boxes', '/stock', 'stock.view', 1);

-- Purchasing
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000005', 'menu-purchases', 'Purchases', 'truck', '/purchases', 'purchase.view', 1);

-- Customers
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000006', 'menu-customers', 'Customers', 'users',           '/customers',  NULL, 1),
('00000000-0000-0000-0000-000000000006', 'menu-suppliers', 'Suppliers', 'truck-delivery',  '/suppliers',  NULL, 2);

-- Finance
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000007', 'menu-payments',   'Payments',    'cash',       '/payments',   'payment.view',      1),
('00000000-0000-0000-0000-000000000007', 'menu-accounting', 'Accounting',  'calculator', '/accounting', 'accounting.module', 2);

-- Reports
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000008', 'menu-reports', 'Reports', 'chart-bar', '/reports', 'report.sales', 1);

-- Marketing
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000009', 'menu-marketing', 'Marketing', 'megaphone', '/marketing', 'marketing.module', 1);

-- HRM
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-00000000000a', 'menu-hrm', 'HR & Payroll', 'users-group', '/hrm', 'hrm.module', 1);

-- CRM
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-00000000000b', 'menu-crm', 'CRM', 'address-book', '/crm', 'crm.module', 1);

-- E-Commerce
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-00000000000c', 'menu-ecommerce', 'E-Commerce', 'world', '/commerce', 'integration.woo', 1);

-- AI
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-00000000000d', 'menu-ai', 'AI Insights', 'brain', '/ai', 'ai.module', 1);

-- Admin
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-00000000000e', 'menu-settings', 'Settings', 'settings', '/settings', NULL, 1);

-- Support
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-00000000000f', 'menu-support', 'Support', 'help-circle', '/support', NULL, 1);


-- 4. Seed path_feature_mappings (matching FeatureGateFilter URL patterns)
INSERT INTO path_feature_mappings (path_pattern, required_feature_key, sort_order) VALUES
('/api/v1/accounting/**',        'accounting.module',   1),
('/api/v1/purchases/**',         'purchase.view',       2),
('/api/v1/hrm/**',               'hrm.module',          3),
('/api/v1/crm/**',               'crm.module',          4),
('/api/v1/ai/**',                'ai.module',           5),
('/api/v1/integrations/**',      'integration.module',  6),
('/api/v1/marketing/**',         'marketing.module',    7),
('/api/v1/admin/audit/**',       'audit.view',          8),
('/api/v1/admin/sessions/**',    'session.manage',      9),
('/api/v1/admin/api-keys/**',    'integration.module',  10),
('/api/v1/reports/custom/**',    'report.custom',       11);
