-- Restore the legacy SmartPOS sidebar inside the dynamic menu system.
-- These are real frontend routes that already exist under /smartpos.

INSERT INTO feature_definitions (key, label, category, sort_order) VALUES
('customer.view', 'View Customers', 'CUSTOMERS', 68),
('customer.manage', 'Manage Customers', 'CUSTOMERS', 69),
('supplier.view', 'View Suppliers', 'CUSTOMERS', 70),
('supplier.manage', 'Manage Suppliers', 'CUSTOMERS', 71),
('loyalty.manage', 'Manage Loyalty', 'CUSTOMERS', 72)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('customer.view', 'PLAN', 'STARTER', true),
('customer.manage', 'PLAN', 'STARTER', true),
('supplier.view', 'PLAN', 'STARTER', true),
('supplier.manage', 'PLAN', 'STARTER', true),
('loyalty.manage', 'PLAN', 'STARTER', true)
ON CONFLICT (feature_key, assignment_level, target_id) DO UPDATE SET granted = EXCLUDED.granted;

UPDATE menu_definitions SET label = 'Dashboard', sort_order = 1 WHERE key = 'section-dashboard';
UPDATE menu_definitions SET label = 'Sales Desk', sort_order = 2 WHERE key = 'section-sales';
UPDATE menu_definitions SET label = 'Products', sort_order = 3 WHERE key = 'section-products';
UPDATE menu_definitions SET label = 'Stock Management', sort_order = 4 WHERE key = 'section-stock';
UPDATE menu_definitions SET label = 'Purchasing', sort_order = 5 WHERE key = 'section-purchasing';
UPDATE menu_definitions SET label = 'Customers & Suppliers', sort_order = 6 WHERE key = 'section-customers';
UPDATE menu_definitions SET label = 'Finance', sort_order = 7 WHERE key = 'section-finance';
UPDATE menu_definitions SET label = 'Reports', sort_order = 8 WHERE key = 'section-reports';
UPDATE menu_definitions SET label = 'Marketing', sort_order = 9 WHERE key = 'section-marketing';
UPDATE menu_definitions SET label = 'HR & Payroll', sort_order = 10 WHERE key = 'section-hrm';
UPDATE menu_definitions SET label = 'CRM', sort_order = 11 WHERE key = 'section-crm';
UPDATE menu_definitions SET label = 'E-Commerce', sort_order = 12 WHERE key = 'section-ecommerce';
UPDATE menu_definitions SET label = 'AI & Insights', sort_order = 13 WHERE key = 'section-ai';
UPDATE menu_definitions SET label = 'Settings & Admin', sort_order = 14 WHERE key = 'section-admin';
UPDATE menu_definitions SET sort_order = 17 WHERE key = 'section-support';

INSERT INTO menu_definitions (key, label, icon, route, required_feature_key, sort_order, is_section_header) VALUES
('section-integrations', 'Integrations', 'plug', NULL, NULL, 15, true),
('section-system', 'System', 'settings', NULL, NULL, 16, true)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route,
    required_feature_key = EXCLUDED.required_feature_key,
    sort_order = EXCLUDED.sort_order,
    is_section_header = EXCLUDED.is_section_header,
    is_visible = true;

WITH menu_rows(parent_key, key, label, icon, route, feature_key, sort_order) AS (
    VALUES
    -- Dashboard
    ('section-dashboard', 'menu-dashboard', 'Dashboard', 'layout-dashboard', '/smartpos/dashboard', NULL, 1),

    -- Sales Desk
    ('section-sales', 'menu-pos', 'POS Terminal', 'cash-register', '/smartpos/sales/pos', 'pos.use', 1),
    ('section-sales', 'menu-sales', 'Sales', 'receipt', '/smartpos/sales', 'sale.view', 2),
    ('section-sales', 'menu-quotations', 'Quotations', 'file-invoice', '/smartpos/quotations', 'sale.view', 3),
    ('section-sales', 'menu-returns', 'Returns', 'arrow-back-up', '/smartpos/returns', 'sale.return', 4),
    ('section-sales', 'menu-suspended-sales', 'Suspended Sales', 'clock', '/smartpos/sales/suspended', 'sale.view', 5),
    ('section-sales', 'menu-recurring-invoices', 'Recurring invoices', 'repeat', '/smartpos/recurring-invoices', 'sale.view', 6),

    -- Products
    ('section-products', 'menu-products', 'Products', 'package', '/smartpos/products', 'product.view', 1),
    ('section-products', 'menu-categories', 'Categories', 'category', '/smartpos/products/categories', 'category.manage', 2),
    ('section-products', 'menu-brands', 'Brands', 'building-store', '/smartpos/products/brands', 'product.view', 3),
    ('section-products', 'menu-units', 'Units', 'ruler', '/smartpos/products/units', 'product.view', 4),
    ('section-products', 'menu-variants', 'Variants', 'box', '/smartpos/products', 'product.view', 5),
    ('section-products', 'menu-barcodes', 'Barcodes', 'barcode', '/smartpos/products/barcodes', 'product.view', 6),
    ('section-products', 'menu-serials', 'Serials & IMEI', 'bookmarks', '/smartpos/products/serials', 'product.view', 7),
    ('section-products', 'menu-bundles', 'Bundles / Kits', 'box', '/smartpos/products/bundles', 'product.view', 8),
    ('section-products', 'menu-price-lists', 'Price Lists', 'receipt', '/smartpos/products/price-lists', 'product.view', 9),
    ('section-products', 'menu-product-labels', 'Product Labels', 'printer', '/smartpos/products/print-labels', 'product.view', 10),
    ('section-products', 'menu-opening-stock', 'Opening Stock', 'upload', '/smartpos/products/opening-stock', 'stock.adjust', 11),
    ('section-products', 'menu-import-products', 'Import Products', 'file-import', '/smartpos/products/import-update', 'product.create', 12),

    -- Stock Management
    ('section-stock', 'menu-warehouses', 'Warehouses', 'building-warehouse', '/smartpos/warehouses', 'stock.view', 1),
    ('section-stock', 'menu-stock', 'Stock Levels', 'box', '/smartpos/stock', 'stock.view', 2),
    ('section-stock', 'menu-stock-adjustments', 'Stock Adjustments', 'adjustments-alt', '/smartpos/stock/adjustments', 'stock.adjust', 3),
    ('section-stock', 'menu-stock-transfers', 'Stock Transfers', 'arrows-transfer-down', '/smartpos/stock/transfers', 'stock.transfer', 4),
    ('section-stock', 'menu-stock-counts', 'Stock Counts', 'clipboard-check', '/smartpos/stock/counts', 'stock.count', 5),
    ('section-stock', 'menu-reorder-rules', 'Reorder Rules', 'alert-triangle', '/smartpos/stock/reorder-rules', 'stock.view', 6),
    ('section-stock', 'menu-expiry-tracking', 'Expiry Tracking', 'clock', '/smartpos/stock/expiry', 'stock.view', 7),
    ('section-stock', 'menu-batch-tracking', 'Batch / Lot Tracking', 'bookmarks', '/smartpos/stock/batches', 'stock.view', 8),
    ('section-stock', 'menu-damage-waste', 'Damage & Waste', 'alert-triangle', '/smartpos/stock/damage', 'stock.adjust', 9),

    -- Purchasing
    ('section-purchasing', 'menu-purchases', 'Purchases', 'shopping-cart', '/smartpos/purchases', 'purchase.view', 1),
    ('section-purchasing', 'menu-goods-received', 'Goods Received', 'box', '/smartpos/purchases/received', 'purchase.view', 2),
    ('section-purchasing', 'menu-supplier-returns', 'Supplier Returns', 'arrow-back-up', '/smartpos/purchases/returns', 'purchase.return', 3),
    ('section-purchasing', 'menu-supplier-payments', 'Supplier Payments', 'coin', '/smartpos/supplier-payments', 'payment.view', 4),
    ('section-purchasing', 'menu-document-search', 'Document Search', 'search', '/smartpos/documents/search', 'purchase.view', 5),

    -- Customers & Suppliers
    ('section-customers', 'menu-customers', 'Customers', 'users', '/smartpos/customers', 'customer.view', 1),
    ('section-customers', 'menu-customer-groups', 'Customer Groups', 'users-group', '/smartpos/customers/groups', 'customer.manage', 2),
    ('section-customers', 'menu-loyalty', 'Loyalty Program', 'gift', '/smartpos/settings/loyalty', 'loyalty.manage', 3),
    ('section-customers', 'menu-gift-cards', 'Gift Cards', 'gift', '/smartpos/customers/gift-cards', 'loyalty.manage', 4),
    ('section-customers', 'menu-store-credit', 'Store Credit', 'wallet', '/smartpos/customers/store-credit', 'customer.manage', 5),
    ('section-customers', 'menu-suppliers', 'Suppliers', 'truck-delivery', '/smartpos/suppliers', 'supplier.view', 6),
    ('section-customers', 'menu-supplier-groups', 'Supplier Groups', 'users-group', '/smartpos/suppliers', 'supplier.manage', 7),

    -- Finance
    ('section-finance', 'menu-accounts', 'Accounts', 'wallet', '/smartpos/accounts', 'account.manage', 1),
    ('section-finance', 'menu-payments', 'Payments', 'coin', '/smartpos/payments', 'payment.view', 2),
    ('section-finance', 'menu-expenses', 'Expenses', 'receipt', '/smartpos/expenses', 'expense.manage', 3),
    ('section-finance', 'menu-deposits', 'Deposits', 'cash', '/smartpos/deposits', 'payment.view', 4),
    ('section-finance', 'menu-cash-management', 'Cash Management', 'cash-banknote', '/smartpos/cash-management', 'payment.view', 5),
    ('section-finance', 'menu-transfers', 'Transfers', 'arrows-transfer-down', '/smartpos/transfers', 'payment.view', 6),
    ('section-finance', 'menu-accounting', 'Accounting', 'calculator', '/smartpos/accounting/chart-of-accounts', 'accounting.module', 7),

    -- Reports
    ('section-reports', 'menu-reports', 'Reports Hub', 'chart-bar', '/smartpos/reports', 'report.sales', 1),
    ('section-reports', 'menu-sales-reports', 'Sales Reports', 'chart-bar', '/smartpos/reports/sales', 'report.sales', 2),
    ('section-reports', 'menu-purchase-reports', 'Purchase Reports', 'shopping-cart', '/smartpos/reports/purchases', 'report.sales', 3),
    ('section-reports', 'menu-inventory-reports', 'Inventory Reports', 'box', '/smartpos/reports/inventory', 'report.inventory', 4),
    ('section-reports', 'menu-financial-reports', 'Financial Reports', 'chart-infographic', '/smartpos/reports/financial', 'report.financial', 5),
    ('section-reports', 'menu-tax-reports', 'Tax Reports', 'percentage', '/smartpos/reports/tax', 'report.financial', 6),
    ('section-reports', 'menu-customer-reports', 'Customer Reports', 'users', '/smartpos/reports/customers', 'report.sales', 7),
    ('section-reports', 'menu-supplier-reports', 'Supplier Reports', 'truck-delivery', '/smartpos/reports/suppliers', 'report.sales', 8),
    ('section-reports', 'menu-employee-reports', 'Employee Reports', 'users-group', '/smartpos/reports/employees', 'report.sales', 9),
    ('section-reports', 'menu-operations-report', 'Operations Report', 'clipboard-check', '/smartpos/reports/operations', 'report.sales', 10),
    ('section-reports', 'menu-export-center', 'Export Center', 'download', '/smartpos/reports/exports', 'report.export', 11),

    -- Marketing
    ('section-marketing', 'menu-marketing', 'Promotions', 'gift', '/smartpos/marketing/promotions', 'marketing.module', 1),
    ('section-marketing', 'menu-coupons', 'Coupons', 'percentage', '/smartpos/marketing/coupons', 'marketing.module', 2),
    ('section-marketing', 'menu-sms-campaigns', 'SMS Campaigns', 'send', '/smartpos/marketing/sms-campaigns', 'marketing.module', 3),
    ('section-marketing', 'menu-email-campaigns', 'Email Campaigns', 'mail', '/smartpos/marketing/email-campaigns', 'marketing.module', 4),
    ('section-marketing', 'menu-whatsapp-campaigns', 'WhatsApp Campaigns', 'brand-whatsapp', '/smartpos/marketing/whatsapp-campaigns', 'marketing.module', 5),

    -- HR & Payroll
    ('section-hrm', 'menu-hrm', 'Employees', 'users-group', '/smartpos/hrm/employees', 'hrm.module', 1),
    ('section-hrm', 'menu-attendance', 'Attendance', 'clock', '/smartpos/hrm/attendance', 'hrm.module', 2),
    ('section-hrm', 'menu-leave-requests', 'Leave requests', 'beach', '/smartpos/hrm/leave', 'hrm.module', 3),
    ('section-hrm', 'menu-payroll', 'Payroll', 'wallet', '/smartpos/hrm/payroll', 'hrm.module', 4),

    -- CRM
    ('section-crm', 'menu-crm', 'Leads', 'users', '/smartpos/crm/leads', 'crm.module', 1),
    ('section-crm', 'menu-opportunities', 'Opportunities', 'chart-bar', '/smartpos/crm/opportunities', 'crm.module', 2),
    ('section-crm', 'menu-follow-ups', 'Follow-Ups', 'bell', '/smartpos/crm/follow-ups', 'crm.module', 3),
    ('section-crm', 'menu-activities', 'Activities', 'clipboard-check', '/smartpos/crm/activities', 'crm.module', 4),

    -- E-Commerce
    ('section-ecommerce', 'menu-ecommerce', 'Dashboard', 'dashboard', '/smartpos/admin/commerce', 'integration.woo', 1),
    ('section-ecommerce', 'menu-commerce-orders', 'Orders', 'shopping-cart', '/smartpos/admin/commerce/orders', 'integration.woo', 2),
    ('section-ecommerce', 'menu-commerce-products', 'Products', 'package', '/smartpos/admin/commerce/products', 'integration.woo', 3),
    ('section-ecommerce', 'menu-commerce-categories', 'Categories', 'category', '/smartpos/admin/commerce/categories', 'integration.woo', 4),
    ('section-ecommerce', 'menu-commerce-settings', 'Store Settings', 'settings', '/smartpos/admin/commerce/settings', 'integration.woo', 5),
    ('section-ecommerce', 'menu-commerce-theme', 'Theme', 'palette', '/smartpos/admin/commerce/theme', 'integration.woo', 6),
    ('section-ecommerce', 'menu-commerce-shipping', 'Shipping', 'truck-delivery', '/smartpos/admin/commerce/shipping', 'integration.woo', 7),
    ('section-ecommerce', 'menu-commerce-banners', 'Banners', 'ad', '/smartpos/admin/commerce/banners', 'integration.woo', 8),

    -- AI & Insights
    ('section-ai', 'menu-ai', 'Insights', 'sparkles', '/smartpos/ai', 'ai.module', 1),
    ('section-ai', 'menu-demand-forecasting', 'Demand Forecasting', 'brain', '/smartpos/ai/forecasting', 'ai.module', 2),
    ('section-ai', 'menu-reorder-suggestions', 'Reorder Suggestions', 'alert-triangle', '/smartpos/ai/reorder-suggestions', 'ai.module', 3),
    ('section-ai', 'menu-customer-analytics', 'Customer Analytics', 'users', '/smartpos/ai/customer-analytics', 'ai.module', 4),
    ('section-ai', 'menu-fraud-detection', 'Fraud Detection', 'alert-triangle', '/smartpos/ai/fraud-detection', 'ai.module', 5),

    -- Settings & Admin
    ('section-admin', 'menu-settings', 'Preferences', 'settings', '/smartpos/settings', NULL, 1),
    ('section-admin', 'menu-users-roles', 'Users & Roles', 'user-shield', '/smartpos/settings/users', 'user.view', 2),
    ('section-admin', 'menu-branches', 'Branches', 'building', '/smartpos/admin/branches', 'branch.view', 3),
    ('section-admin', 'menu-pos-terminals', 'POS terminals', 'device-desktop', '/smartpos/pos/terminals', 'pos.use', 4),
    ('section-admin', 'menu-receipt-settings', 'Receipt Settings', 'receipt', '/smartpos/settings/receipt', NULL, 5),
    ('section-admin', 'menu-printer-settings', 'Printer Settings', 'printer', '/smartpos/settings/printers', NULL, 6),
    ('section-admin', 'menu-tax-pricing', 'Tax & Pricing', 'percentage', '/smartpos/settings/tax-pricing', 'accounting.module', 7),
    ('section-admin', 'menu-i18n', 'Languages & translations', 'language', '/smartpos/settings/i18n', NULL, 8),
    ('section-admin', 'menu-localization', 'Localization', 'world', '/smartpos/settings/locale', NULL, 9),
    ('section-admin', 'menu-notifications', 'Notifications', 'bell-ringing', '/smartpos/settings/notifications', 'notification.view', 10),

    -- Integrations
    ('section-integrations', 'menu-integrations', 'Integrations', 'plug', '/smartpos/integrations', 'integration.module', 1),
    ('section-integrations', 'menu-payment-gateways', 'Payment Gateways', 'credit-card', '/smartpos/integrations/payment-gateways', 'integration.module', 2),
    ('section-integrations', 'menu-tra-efd', 'TRA EFD', 'receipt-tax', '/smartpos/integrations/tra-efd', 'integration.zatca', 3),
    ('section-integrations', 'menu-integration-accounting', 'Accounting', 'calculator', '/smartpos/integrations/accounting', 'integration.module', 4),
    ('section-integrations', 'menu-sms-providers', 'SMS Providers', 'message', '/smartpos/integrations/sms', 'integration.module', 5),
    ('section-integrations', 'menu-whatsapp-api', 'WhatsApp API', 'brand-whatsapp', '/smartpos/integrations/whatsapp', 'integration.module', 6),
    ('section-integrations', 'menu-webhooks', 'Webhooks', 'webhook', '/smartpos/integrations/webhooks', 'integration.module', 7),
    ('section-integrations', 'menu-seo', 'SEO', 'search', '/smartpos/admin/commerce/seo', 'integration.woo', 8),
    ('section-integrations', 'menu-domains', 'Domains', 'world', '/smartpos/admin/commerce/domains', 'integration.woo', 9),

    -- System
    ('section-system', 'menu-subscription-billing', 'Subscription & Billing', 'credit-card', '/smartpos/billing', 'billing.view', 1),
    ('section-system', 'menu-admin-dashboard', 'Dashboard', 'dashboard', '/smartpos/admin/tenants', 'admin', 2),
    ('section-system', 'menu-all-tenants', 'All Tenants', 'building', '/smartpos/admin/tenants/list', 'admin', 3),
    ('section-system', 'menu-plans', 'Plans', 'receipt', '/smartpos/admin/billing/plans', 'billing.manage', 4),
    ('section-system', 'menu-invoices', 'Invoices', 'file-invoice', '/smartpos/admin/billing/invoices', 'billing.view', 5),
    ('section-system', 'menu-audit-logs', 'Audit Logs', 'history', '/smartpos/admin/audit-logs', 'audit.view', 6),
    ('section-system', 'menu-data-retention', 'Data Retention', 'database', '/smartpos/admin/data-retention', 'audit.view', 7),
    ('section-system', 'menu-sessions', 'Sessions', 'device-mobile', '/smartpos/admin/sessions', 'session.manage', 8),
    ('section-system', 'menu-api-keys', 'API Keys', 'key', '/smartpos/admin/api-keys', 'integration.module', 9),
    ('section-system', 'menu-error-logs', 'Error Logs', 'bug', '/smartpos/admin/error-logs', 'admin', 10),
    ('section-system', 'menu-backups', 'Backups', 'download', '/smartpos/admin/backups', 'admin', 11),
    ('section-system', 'menu-troubleshooting', 'Troubleshooting', 'tools', '/smartpos/admin/troubleshooting', 'admin', 12),
    ('section-system', 'menu-features', 'Feature Manager', 'adjustments-alt', '/smartpos/admin/features', 'admin', 13),

    -- Support
    ('section-support', 'menu-support', 'Help Center', 'help-circle', '/smartpos/support/help', NULL, 1),
    ('section-support', 'menu-tutorials', 'Tutorials', 'help', '/smartpos/support/tutorials', NULL, 2),
    ('section-support', 'menu-system-status', 'System Status', 'chart-bar', '/smartpos/support/system-status', NULL, 3),
    ('section-support', 'menu-contact-support', 'Contact Support', 'bell', '/smartpos/support/contact', NULL, 4)
)
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key, sort_order, is_section_header, is_visible)
SELECT parent.id, rows.key, rows.label, rows.icon, rows.route, rows.feature_key, rows.sort_order, false, true
FROM menu_rows rows
JOIN menu_definitions parent ON parent.key = rows.parent_key
ON CONFLICT (key) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route,
    required_feature_key = EXCLUDED.required_feature_key,
    sort_order = EXCLUDED.sort_order,
    is_section_header = false,
    is_visible = true;
