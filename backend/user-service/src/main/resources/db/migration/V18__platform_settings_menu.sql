-- Add Platform Settings menu item under the Admin section.
-- Uses the same idempotent CTE pattern as V14/V16.

WITH menu_rows(key, label, icon, route, feature_key, sort_order) AS (
    VALUES
    ('menu-platform-settings', 'Platform Settings', 'settings',
     '/smartpos/admin/platform-settings', NULL, 20)
)
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key,
                              sort_order, is_section_header, is_visible)
SELECT parent.id, rows.key, rows.label, rows.icon, rows.route, rows.feature_key,
       rows.sort_order, false, true
FROM menu_rows rows
JOIN menu_definitions parent ON parent.key = 'section-admin'
ON CONFLICT (key) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route,
    required_feature_key = EXCLUDED.required_feature_key,
    sort_order = EXCLUDED.sort_order,
    is_section_header = false,
    is_visible = true;
