CREATE TABLE plan_definitions (
    id UUID PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    label VARCHAR(50) NOT NULL,
    description TEXT,
    monthly_price_tzs BIGINT,
    annual_price_tzs BIGINT,
    max_users INT NOT NULL DEFAULT 5,
    max_stores INT NOT NULL DEFAULT 1,
    max_products INT NOT NULL DEFAULT 1000,
    features JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    plan_code VARCHAR(20) NOT NULL REFERENCES plan_definitions(code),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'MONTHLY',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount_tzs BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(30),
    payment_reference VARCHAR(100),
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plan definitions
INSERT INTO plan_definitions (id, code, label, description, monthly_price_tzs, annual_price_tzs, max_users, max_stores, max_products, features, sort_order) VALUES
  (gen_random_uuid(), 'STARTER', 'Starter', 'For single dukas and small shops', 15000, 150000, 2, 1, 500, '{"accounting":false,"purchases":false,"reports":"basic","hrm":false,"crm":false,"api":false,"multi_currency":false,"multi_company":false,"white_label":false,"branches":false,"marketing":false,"audit":false,"support":"email"}', 1),
  (gen_random_uuid(), 'BUSINESS', 'Business', 'For growing retailers — full financial suite', 35000, 350000, 5, 3, 5000, '{"accounting":true,"purchases":true,"reports":"full","hrm":false,"crm":false,"api":false,"multi_currency":false,"multi_company":false,"white_label":false,"branches":true,"marketing":true,"audit":false,"support":"priority_email"}', 2),
  (gen_random_uuid(), 'PROFESSIONAL', 'Professional', 'For established businesses — HRM, CRM, API', 79000, 790000, 25, 10, 25000, '{"accounting":true,"purchases":true,"reports":"full_export","hrm":true,"crm":true,"api":true,"multi_currency":true,"multi_company":false,"white_label":false,"branches":true,"marketing":true,"audit":true,"support":"chat_phone"}', 3),
  (gen_random_uuid(), 'ENTERPRISE', 'Enterprise', 'For supermarket chains and large organizations', 250000, null, 2147483647, 2147483647, 2147483647, '{"accounting":true,"purchases":true,"reports":"full_custom","hrm":true,"crm":true,"api":true,"multi_currency":true,"multi_company":true,"white_label":true,"branches":true,"marketing":true,"audit":true,"support":"dedicated_am"}', 4);
