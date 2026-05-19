-- Feature catalog
CREATE TABLE feature_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_feature_defs_category ON feature_definitions(category);
CREATE INDEX idx_feature_defs_active ON feature_definitions(is_active);

-- Feature assignments (plan / tenant / user)
CREATE TABLE feature_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key VARCHAR(100) NOT NULL REFERENCES feature_definitions(key) ON DELETE CASCADE,
    assignment_level VARCHAR(10) NOT NULL CHECK (assignment_level IN ('PLAN', 'TENANT', 'USER')),
    target_id VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (feature_key, assignment_level, target_id)
);

CREATE INDEX idx_feature_assign_target ON feature_assignments(assignment_level, target_id);
CREATE INDEX idx_feature_assign_key ON feature_assignments(feature_key);

-- Menu tree
CREATE TABLE menu_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES menu_definitions(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    route VARCHAR(255),
    required_feature_key VARCHAR(100) REFERENCES feature_definitions(key) ON DELETE SET NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    is_section_header BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_menu_parent ON menu_definitions(parent_id);
CREATE INDEX idx_menu_sort ON menu_definitions(parent_id, sort_order);

-- Path-to-feature mapping for gateway
CREATE TABLE path_feature_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_pattern VARCHAR(255) NOT NULL UNIQUE,
    required_feature_key VARCHAR(100) NOT NULL REFERENCES feature_definitions(key) ON DELETE CASCADE,
    http_status_on_deny INT NOT NULL DEFAULT 402,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_path_mapping_pattern ON path_feature_mappings(path_pattern);
