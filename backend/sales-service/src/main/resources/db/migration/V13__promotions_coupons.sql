CREATE TABLE promotions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL,                    -- PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE
    discount_value DECIMAL(10,2) NOT NULL,         -- percentage (0-100) or fixed amount in TZS
    start_date DATE NOT NULL,
    end_date DATE,
    applies_to VARCHAR(20) NOT NULL DEFAULT 'all', -- all, product, category
    product_ids JSONB,                             -- ["uuid1", "uuid2"] if applies_to=product
    category_ids JSONB,                            -- ["uuid1"] if applies_to=category
    min_purchase_amount DECIMAL(12,2),
    max_discount_amount DECIMAL(12,2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE', -- PERCENTAGE, FIXED_AMOUNT
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INT,                                    -- NULL = unlimited
    used_count INT NOT NULL DEFAULT 0,
    min_purchase_amount DECIMAL(12,2),
    max_discount_amount DECIMAL(12,2),
    valid_from DATE NOT NULL,
    valid_until DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupon_usages (
    id UUID PRIMARY KEY,
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    sale_id UUID,
    tenant_id UUID NOT NULL,
    discount_applied DECIMAL(12,2) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
