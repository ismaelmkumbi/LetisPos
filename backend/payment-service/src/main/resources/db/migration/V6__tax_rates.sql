CREATE TABLE tax_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(100) NOT NULL,
    rate            DECIMAL(5,2) NOT NULL,
    type            VARCHAR(30) NOT NULL DEFAULT 'VAT',
    description     VARCHAR(300),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_rates_tenant ON tax_rates (tenant_id);

-- Seed default tax rates (Tanzania context)
INSERT INTO tax_rates (tenant_id, name, rate, type, description) VALUES
    ('00000000-0000-0000-0000-000000000000', 'VAT Standard', 18.00, 'VAT', 'Standard VAT rate (Tanzania)'),
    ('00000000-0000-0000-0000-000000000000', 'VAT Exempt', 0.00, 'VAT', 'VAT exempt goods and services'),
    ('00000000-0000-0000-0000-000000000000', 'Service Tax', 15.00, 'SERVICE', 'Service tax rate'),
    ('00000000-0000-0000-0000-000000000000', 'Sales Tax', 10.00, 'SALES', 'General sales tax');
