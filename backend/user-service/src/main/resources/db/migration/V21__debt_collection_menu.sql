-- Add "Debt Collection" section header and menu items
-- Sits between Reports (sort_order 8) and Marketing (sort_order 9)

-- Ensure the debt.collection feature exists before inserting menu items
-- that reference it. This migration is the authoritative seed for this feature.
INSERT INTO feature_definitions (key, label, category, sort_order)
VALUES ('debt.collection', 'Debt Collection Module', 'FINANCE', 28)
ON CONFLICT (key) DO NOTHING;

INSERT INTO menu_definitions (key, label, icon, route, required_feature_key, sort_order, is_section_header)
VALUES ('section-debt-collection', 'Debt Collection', 'coin', NULL, NULL, 8.5, true)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route,
    required_feature_key = EXCLUDED.required_feature_key,
    sort_order = EXCLUDED.sort_order,
    is_section_header = EXCLUDED.is_section_header,
    is_visible = true;

-- Child menu items
WITH menu_rows(parent_key, key, label, icon, route, feature_key, sort_order) AS (
    VALUES
    ('section-debt-collection', 'menu-debt-dashboard', 'Debt Dashboard', 'dashboard', '/smartpos/debt/dashboard', 'debt.collection', 1),
    ('section-debt-collection', 'menu-debtors', 'Debtors (AR)', 'users', '/smartpos/debt/debtors', 'debt.collection', 2),
    ('section-debt-collection', 'menu-creditors', 'Creditors (AP)', 'truck-delivery', '/smartpos/debt/creditors', 'debt.collection', 3),
    ('section-debt-collection', 'menu-debt-documents', 'Documents', 'file-invoice', '/smartpos/debt/documents', 'debt.collection', 4)
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
