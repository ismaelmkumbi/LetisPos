-- User Service — initial schema
-- Profiles, roles, permissions, warehouse assignments.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE user_profiles (
    id                   UUID        PRIMARY KEY,    -- same UUID as auth_db.users.id
    email                CITEXT      NOT NULL,
    first_name           VARCHAR(100),
    last_name            VARCHAR(100),
    phone                VARCHAR(32),
    avatar_url           TEXT,
    address              TEXT,
    city                 VARCHAR(100),
    country              VARCHAR(100),
    is_all_warehouses    BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
    tenant_id            UUID,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_user_profiles_email ON user_profiles (email);

CREATE TABLE roles (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL,
    label       VARCHAR(128),
    description TEXT,
    tenant_id   UUID,
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_roles_tenant_name ON roles (tenant_id, lower(name));

CREATE TABLE permissions (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_user ON user_roles (user_id);

CREATE TABLE user_warehouses (
    user_id      UUID NOT NULL,
    warehouse_id UUID NOT NULL,
    PRIMARY KEY (user_id, warehouse_id)
);
CREATE INDEX idx_user_warehouses_user ON user_warehouses (user_id);

-- Seed baseline permissions mirrored from the legacy Stocky system.
INSERT INTO permissions (id, name, description) VALUES
  (uuid_generate_v4(), 'user.view',        'View users'),
  (uuid_generate_v4(), 'user.create',      'Create users'),
  (uuid_generate_v4(), 'user.update',      'Update users'),
  (uuid_generate_v4(), 'user.delete',      'Delete users'),
  (uuid_generate_v4(), 'role.view',        'View roles'),
  (uuid_generate_v4(), 'role.manage',      'Create/update/delete roles'),
  (uuid_generate_v4(), 'product.view',     'View products'),
  (uuid_generate_v4(), 'product.create',   'Create products'),
  (uuid_generate_v4(), 'product.update',   'Update products'),
  (uuid_generate_v4(), 'product.delete',   'Delete products'),
  (uuid_generate_v4(), 'category.manage',  'Manage categories/brands/units'),
  (uuid_generate_v4(), 'customer.manage',  'Manage customers'),
  (uuid_generate_v4(), 'supplier.manage',  'Manage suppliers'),
  (uuid_generate_v4(), 'warehouse.manage', 'Manage warehouses'),
  (uuid_generate_v4(), 'stock.view',       'View stock levels'),
  (uuid_generate_v4(), 'stock.transfer',   'Create stock transfers'),
  (uuid_generate_v4(), 'stock.adjust',     'Create stock adjustments'),
  (uuid_generate_v4(), 'stock.count',      'Perform stock counts'),
  (uuid_generate_v4(), 'sale.view',        'View sales'),
  (uuid_generate_v4(), 'sale.create',      'Create sales'),
  (uuid_generate_v4(), 'sale.update',      'Update sales'),
  (uuid_generate_v4(), 'sale.delete',      'Void sales'),
  (uuid_generate_v4(), 'sale.return',      'Process sale returns'),
  (uuid_generate_v4(), 'pos.use',          'Use POS terminal'),
  (uuid_generate_v4(), 'quotation.manage', 'Manage quotations'),
  (uuid_generate_v4(), 'purchase.view',    'View purchases'),
  (uuid_generate_v4(), 'purchase.create',  'Create purchases'),
  (uuid_generate_v4(), 'purchase.update',  'Update purchases'),
  (uuid_generate_v4(), 'purchase.delete',  'Void purchases'),
  (uuid_generate_v4(), 'purchase.return',  'Process purchase returns'),
  (uuid_generate_v4(), 'payment.view',     'View payments'),
  (uuid_generate_v4(), 'payment.record',   'Record payments'),
  (uuid_generate_v4(), 'payment.refund',   'Refund payments'),
  (uuid_generate_v4(), 'account.manage',   'Manage accounts'),
  (uuid_generate_v4(), 'expense.manage',   'Manage expenses'),
  (uuid_generate_v4(), 'deposit.manage',   'Manage deposits'),
  (uuid_generate_v4(), 'report.sales',     'Sales reports'),
  (uuid_generate_v4(), 'report.inventory', 'Inventory reports'),
  (uuid_generate_v4(), 'report.financial', 'Financial reports'),
  (uuid_generate_v4(), 'report.export',    'Export reports'),
  (uuid_generate_v4(), 'settings.manage',  'Manage system settings');

-- Seed a system admin role with ALL permissions.
INSERT INTO roles (id, name, label, description, is_system)
  VALUES ('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Administrator', 'Full system access', TRUE);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions;

-- Seed a cashier role with POS-focused permissions.
INSERT INTO roles (id, name, label, description, is_system)
  VALUES ('00000000-0000-0000-0000-000000000002', 'CASHIER', 'Cashier', 'POS cashier', TRUE);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
   WHERE name IN ('pos.use','sale.view','sale.create','sale.return','product.view',
                  'customer.manage','stock.view','quotation.manage','payment.record');
