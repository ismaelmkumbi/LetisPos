-- Add Brand Identity and Document Themes menu items under Settings & Admin.
-- Uses the same idempotent CTE pattern as V14.

WITH menu_rows(parent_key, key, label, icon, route, feature_key, sort_order) AS (
    VALUES
    ('section-admin', 'menu-brand-identity', 'Brand Identity', 'palette',
     '/smartpos/settings/brand-identity', NULL, 11),
    ('section-admin', 'menu-document-themes', 'Document Themes', 'eye',
     '/smartpos/settings/document-themes', NULL, 12)
)
INSERT INTO menu_definitions (parent_id, key, label, icon, route, required_feature_key,
                              sort_order, is_section_header, is_visible)
SELECT parent.id, rows.key, rows.label, rows.icon, rows.route, rows.feature_key,
       rows.sort_order, false, true
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
