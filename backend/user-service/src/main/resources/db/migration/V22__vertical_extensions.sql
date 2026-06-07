-- =============================================================================
-- V22: Vertical Module Extensions
--   Enables per-tenant, per-product vertical-specific attributes (pharmacy,
--   hardware, restaurant, etc.) without bloating the core products table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. vertical_definitions: registry of available verticals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vertical_definitions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. 'pharmacy', 'hardware'
    label       VARCHAR(100) NOT NULL,          -- e.g. 'Pharmacy / Duka la Dawa'
    description TEXT,
    category    VARCHAR(50)  NOT NULL DEFAULT 'VERTICAL',
    feature_key VARCHAR(100),                  -- links to feature_definitions.key
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

-- Seed initial verticals
INSERT INTO vertical_definitions (key, label, description, feature_key, sort_order)
VALUES
    ('pharmacy',    'Pharmacy',           'Pharmaceutical products, prescriptions, drug tracking',        'pharmacy.module',    1),
    ('hardware',    'Hardware',           'Tools, electronics, machinery, warranty tracking',               'hardware.module',    2),
    ('restaurant',  'Restaurant & Food',  'Food service, table management, kitchen display',               'restaurant.module',  3),
    ('supermarket', 'Supermarket',        'Fast-moving consumer goods, shelf management, expiry alerts',   'supermarket.module', 4)
ON CONFLICT (key) DO UPDATE SET
    label       = EXCLUDED.label,
    description = EXCLUDED.description,
    feature_key = EXCLUDED.feature_key,
    sort_order  = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 2. tenant_verticals: which verticals each tenant has activated
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_verticals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL,
    vertical_key VARCHAR(50)  NOT NULL REFERENCES vertical_definitions(key),
    activated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    activated_by UUID,                         -- admin user who enabled
    settings     JSONB        DEFAULT '{}',    -- per-vertical tenant config
    UNIQUE (tenant_id, vertical_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_verticals_tenant ON tenant_verticals(tenant_id);

-- ---------------------------------------------------------------------------
-- 3. product_vertical_extensions: JSONB storage per product per vertical
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_vertical_extensions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL,
    vertical_key VARCHAR(50)  NOT NULL REFERENCES vertical_definitions(key),
    data        JSONB        NOT NULL DEFAULT '{}',
    tenant_id   UUID         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, vertical_key)
);

CREATE INDEX IF NOT EXISTS idx_pve_product ON product_vertical_extensions(product_id);
CREATE INDEX IF NOT EXISTS idx_pve_vertical ON product_vertical_extensions(vertical_key);
CREATE INDEX IF NOT EXISTS idx_pve_tenant ON product_vertical_extensions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pve_data ON product_vertical_extensions USING GIN (data);

-- ---------------------------------------------------------------------------
-- 4. vertical_field_definitions: metadata for dynamic UI form generation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vertical_field_definitions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_key VARCHAR(50)  NOT NULL REFERENCES vertical_definitions(key),
    field_key    VARCHAR(64)  NOT NULL,
    label        VARCHAR(128) NOT NULL,
    field_type   VARCHAR(32)  NOT NULL,        -- 'text', 'number', 'select', 'toggle', 'date'
    required     BOOLEAN      NOT NULL DEFAULT FALSE,
    options      JSONB,                        -- for select fields: [{value, label}]
    validation_pattern VARCHAR(255),           -- regex for validation
    help_text    TEXT,
    sort_order   INT          NOT NULL DEFAULT 0,
    UNIQUE (vertical_key, field_key)
);

-- Pharmacy field definitions
INSERT INTO vertical_field_definitions (vertical_key, field_key, label, field_type, required, options, sort_order)
VALUES
    ('pharmacy', 'genericName',           'Generic Name',           'text',    FALSE, NULL, 1),
    ('pharmacy', 'strength',              'Strength',               'text',    FALSE, NULL, 2),
    ('pharmacy', 'dosageForm',            'Dosage Form',            'select',  FALSE, '[{"value":"TABLET","label":"Tablet"},{"value":"CAPSULE","label":"Capsule"},{"value":"SYRUP","label":"Syrup"},{"value":"INJECTION","label":"Injection"},{"value":"CREAM","label":"Cream"},{"value":"DROPS","label":"Drops"},{"value":"INHALER","label":"Inhaler"}]', 3),
    ('pharmacy', 'prescriptionRequired',  'Prescription Required',  'toggle',  FALSE, NULL, 4),
    ('pharmacy', 'controlledSchedule',    'Controlled Schedule',    'select',  FALSE, '[{"value":"2","label":"Schedule II"},{"value":"3","label":"Schedule III"},{"value":"4","label":"Schedule IV"},{"value":"5","label":"Schedule V"}]', 5),
    ('pharmacy', 'storageCondition',      'Storage Condition',      'select',  FALSE, '[{"value":"ROOM_TEMP","label":"Room Temperature"},{"value":"REFRIGERATED","label":"Refrigerated (2-8°C)"},{"value":"FROZEN","label":"Frozen (-20°C)"}]', 6),
    ('pharmacy', 'ndaRegistration',       'NDA / TFDA Registration','text',    FALSE, NULL, 7),
    ('pharmacy', 'therapeuticClass',      'Therapeutic Class',      'text',    FALSE, NULL, 8),
    ('pharmacy', 'activeIngredient',      'Active Ingredient',      'text',    FALSE, NULL, 9)
ON CONFLICT (vertical_key, field_key) DO UPDATE SET
    label    = EXCLUDED.label,
    field_type = EXCLUDED.field_type,
    required = EXCLUDED.required,
    options  = EXCLUDED.options,
    sort_order = EXCLUDED.sort_order;

-- Hardware field definitions
INSERT INTO vertical_field_definitions (vertical_key, field_key, label, field_type, required, options, sort_order)
VALUES
    ('hardware', 'partNumber',     'Part Number / SKU',    'text',   FALSE, NULL, 1),
    ('hardware', 'oemBrand',       'OEM Brand',            'text',   FALSE, NULL, 2),
    ('hardware', 'warrantyMonths', 'Warranty (months)',    'number', FALSE, NULL, 3),
    ('hardware', 'powerWatts',     'Power (Watts)',        'number', FALSE, NULL, 4),
    ('hardware', 'voltage',        'Voltage',              'text',   FALSE, NULL, 5),
    ('hardware', 'material',       'Material',             'text',   FALSE, NULL, 6),
    ('hardware', 'countryOfOrigin','Country of Origin',    'text',   FALSE, NULL, 7)
ON CONFLICT (vertical_key, field_key) DO UPDATE SET
    label    = EXCLUDED.label,
    field_type = EXCLUDED.field_type,
    required = EXCLUDED.required,
    options  = EXCLUDED.options,
    sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 5. Feature definitions for vertical gating
-- ---------------------------------------------------------------------------
INSERT INTO feature_definitions (key, label, category, sort_order) VALUES
    ('pharmacy.module',       'Pharmacy Module',        'VERTICAL', 100),
    ('pharmacy.prescription', 'Prescription Workflow',  'VERTICAL', 101),
    ('pharmacy.controlled',   'Controlled Substances',  'VERTICAL', 102),
    ('hardware.module',       'Hardware Module',        'VERTICAL', 110),
    ('hardware.warranty',     'Warranty Tracking',        'VERTICAL', 111),
    ('restaurant.module',     'Restaurant Module',      'VERTICAL', 120),
    ('supermarket.module',    'Supermarket Module',     'VERTICAL', 130)
ON CONFLICT (key) DO UPDATE SET
    label      = EXCLUDED.label,
    category   = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- Assign pharmacy.module to PROFESSIONAL plan (extend as needed)
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted)
SELECT 'pharmacy.module', 'PLAN', id, true
FROM subscription_plans WHERE plan_key = 'PROFESSIONAL'
ON CONFLICT DO NOTHING;

INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted)
SELECT 'hardware.module', 'PLAN', id, true
FROM subscription_plans WHERE plan_key = 'PROFESSIONAL'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Pharmacy menu items
-- ---------------------------------------------------------------------------
INSERT INTO menu_definitions (key, label, icon, route, required_feature_key, sort_order, is_section_header)
VALUES ('section-pharmacy', 'Pharmacy', 'pill', NULL, 'pharmacy.module', 14, true)
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
    ('section-pharmacy', 'menu-pharmacy-drugs',     'Drug Catalog',        'pill',         '/smartpos/pharmacy/drugs',     'pharmacy.module',       1),
    ('section-pharmacy', 'menu-pharmacy-prescriptions', 'Prescriptions', 'file-prescription', '/smartpos/pharmacy/prescriptions', 'pharmacy.prescription', 2),
    ('section-pharmacy', 'menu-pharmacy-patients',  'Patients',            'users',        '/smartpos/pharmacy/patients',  'pharmacy.module',       3),
    ('section-pharmacy', 'menu-pharmacy-controlled','Controlled Substances', 'shield',   '/smartpos/pharmacy/controlled','pharmacy.controlled',   4)
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

-- ---------------------------------------------------------------------------
-- 7. Path feature mappings for vertical-module API routes
--    Gateway fetches these via /api/internal/features/path-mappings every 5 min
-- ---------------------------------------------------------------------------
INSERT INTO path_feature_mappings (path_pattern, required_feature_key, sort_order) VALUES
    ('/api/v1/pharmacy/**',     'pharmacy.module',        100),
    ('/api/v1/hardware/**',     'hardware.module',        110),
    ('/api/v1/restaurant/**',   'restaurant.module',      120),
    ('/api/v1/supermarket/**',  'supermarket.module',     130)
ON CONFLICT (path_pattern) DO UPDATE SET
    required_feature_key = EXCLUDED.required_feature_key,
    sort_order = EXCLUDED.sort_order;
